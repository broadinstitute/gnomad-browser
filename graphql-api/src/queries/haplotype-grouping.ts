/**
 * Haplotype grouping: takes ClickHouse rows pre-grouped by (sample_id, strand)
 * and clusters them into haplotype groups by shared variant signature.
 *
 * Optimized: ClickHouse does the GROUP BY, and similarity uses Set intersection.
 */

import {
  computeSVDistanceMatrix,
  buildUPGMATree,
  getClustersAtThreshold,
  getLeafGroupHashes,
  type TreeNode,
} from './genealogy-math'

// --- UPGMA tree cache (bounded Map, max 5 entries) ---
const upgmaTreeCache = new Map<string, { tree: TreeNode; leafOrder: string[] }>()
const TREE_CACHE_MAX = 5

function cacheTree(key: string, value: { tree: TreeNode; leafOrder: string[] }) {
  if (upgmaTreeCache.size >= TREE_CACHE_MAX) {
    // Evict oldest entry (first key in insertion order)
    const firstKey = upgmaTreeCache.keys().next().value
    if (firstKey !== undefined) upgmaTreeCache.delete(firstKey)
  }
  upgmaTreeCache.set(key, value)
}

type GroupedRow = {
  sample_id: string
  strand: number
  positions: number[]
  refs: string[]
  alts: string[]
  rsids: string[]
  afs: number[]
  acs: number[]
  ans: number[]
  allele_types: string[]
  allele_lengths: number[]
  af_afrs: (number | null)[]
  af_amrs: (number | null)[]
  af_eass: (number | null)[]
  af_nfes: (number | null)[]
  af_sass: (number | null)[]
  cadd_phreds: (number | null)[]
  phylops: (number | null)[]
  sv_consequences_arr: (string[] | null)[]
  dbgap_ids: (string | null)[]
  tr_ids: (string | null)[]
  tr_motifs_arr: (string | null)[]
  tr_strucs: (string | null)[]
  allele_methylations: (number | null)[]
  motif_counts_arr: (number[] | null)[]
  allele_purities: (number | null)[]
}

export type LRVariant = {
  variant_id: string
  chrom: string
  pos: number
  end: number | null
  ref: string
  alt: string
  allele_type: string
  allele_length: number
  freq: {
    af: number
    ac: number
    an: number
  }
  populations: Array<{ id: string; af: number }>
  rsid: string
  major_consequence: string | null
  cadd_phred: number | null
  phylop: number | null
  sv_consequences: string[] | null
  dbgap_id: string | null
  tr_id: string | null
  tr_motifs: string | null
  gnomad_str: string | null
  allele_methylation: number | null
  motif_counts: number[] | null
  allele_purity: number | null
  in_samples?: string[]
  gt_phased?: boolean
}

function buildVariant(
  chrom: string, pos: number, ref: string, alt: string, rsid: string,
  af: number, ac: number, an: number, alleleType: string, alleleLength: number,
  afAfr: number | null, afAmr: number | null, afEas: number | null,
  afNfe: number | null, afSas: number | null,
  caddPhred: number | null, phylop: number | null,
  svConsequences: string[] | null, dbgapId: string | null,
  trId: string | null, trMotifs: string | null, gnomadStr: string | null,
  alleleMethylation: number | null, motifCounts: number[] | null,
  allelePurity: number | null,
): LRVariant {
  const populations: Array<{ id: string; af: number }> = []
  if (afAfr != null) populations.push({ id: 'afr', af: afAfr })
  if (afAmr != null) populations.push({ id: 'amr', af: afAmr })
  if (afEas != null) populations.push({ id: 'eas', af: afEas })
  if (afNfe != null) populations.push({ id: 'nfe', af: afNfe })
  if (afSas != null) populations.push({ id: 'sas', af: afSas })

  const resolvedAlleleType = alleleType || 'snv'
  const resolvedLength = alleleLength || 0

  // Compute end position for SVs/deletions
  let end: number | null = null
  if (resolvedAlleleType !== 'snv' && Math.abs(resolvedLength) >= 50) {
    end = pos + Math.abs(resolvedLength)
  }

  return {
    variant_id: `${chrom}:${pos}`,
    chrom,
    pos,
    end,
    ref,
    alt,
    allele_type: resolvedAlleleType,
    allele_length: resolvedLength,
    freq: { af, ac, an },
    populations,
    rsid: rsid || '',
    major_consequence: null,
    cadd_phred: caddPhred,
    phylop,
    sv_consequences: svConsequences && svConsequences.length > 0 ? svConsequences : null,
    dbgap_id: dbgapId || null,
    tr_id: trId || null,
    tr_motifs: trMotifs || null,
    gnomad_str: gnomadStr || null,
    allele_methylation: alleleMethylation,
    motif_counts: motifCounts && motifCounts.length > 0 ? motifCounts : null,
    allele_purity: allelePurity,
  }
}

const hashString = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return hash.toString()
}

/**
 * Build haplotype groups from ClickHouse pre-grouped rows.
 */
export const createHaplotypeGroupsFromGrouped = (
  rows: GroupedRow[],
  chrom: string,
  start: number,
  stop: number,
  minAlleleFreq: number = 0,
  sortBy: string = 'similarity_score'
) => {
  const haplotypeGroups: Record<string, any> = {}

  for (const row of rows) {
    const n = row.positions.length
    const aboveThreshold: LRVariant[] = []
    const belowThreshold: LRVariant[] = []

    for (let i = 0; i < n; i++) {
      const pos = Number(row.positions[i])
      if (pos < start || pos > stop) continue

      const af = Number(row.afs[i])
      const toNum = (v: number | null | undefined) => v != null ? Number(v) : null
      const toStr = (v: string | null | undefined) => v || null
      const variant = buildVariant(
        chrom, pos,
        row.refs[i], row.alts[i], row.rsids[i],
        af, Number(row.acs[i]), Number(row.ans[i]),
        row.allele_types[i], Number(row.allele_lengths[i]),
        toNum(row.af_afrs?.[i]), toNum(row.af_amrs?.[i]), toNum(row.af_eass?.[i]),
        toNum(row.af_nfes?.[i]), toNum(row.af_sass?.[i]),
        toNum(row.cadd_phreds?.[i]), toNum(row.phylops?.[i]),
        row.sv_consequences_arr?.[i] || null, toStr(row.dbgap_ids?.[i]),
        toStr(row.tr_ids?.[i]), toStr(row.tr_motifs_arr?.[i]), toStr(row.tr_strucs?.[i]),
        toNum(row.allele_methylations?.[i]), row.motif_counts_arr?.[i] || null,
        toNum(row.allele_purities?.[i]),
      )

      if (af >= minAlleleFreq) {
        aboveThreshold.push(variant)
      } else {
        belowThreshold.push(variant)
      }
    }

    if (aboveThreshold.length === 0) continue

    const readableId = aboveThreshold
      .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')
    const groupHash = hashString(readableId)

    const sample = {
      sample_id: row.sample_id,
      variant_sets: [{ variants: aboveThreshold, readable_id: readableId }],
    }

    if (!haplotypeGroups[groupHash]) {
      haplotypeGroups[groupHash] = {
        samples: [sample],
        variants: { variants: aboveThreshold, readable_id: readableId },
        below_threshold: {
          variants: belowThreshold.map((v) => ({ ...v, in_samples: [row.sample_id] })),
          readable_id: '',
        },
        start: Math.min(...aboveThreshold.map((v) => v.pos)),
        stop: Math.max(...aboveThreshold.map((v) => v.pos)),
        readable_id: readableId,
        hash: groupHash,
      }
    } else {
      haplotypeGroups[groupHash].samples.push(sample)
      for (const v of belowThreshold) {
        const existing = haplotypeGroups[groupHash].below_threshold.variants.find(
          (ev: any) => ev.pos === v.pos
        )
        if (existing) {
          existing.in_samples.push(row.sample_id)
        } else {
          haplotypeGroups[groupHash].below_threshold.variants.push({
            ...v,
            in_samples: [row.sample_id],
          })
        }
      }
    }
  }

  let groups = Object.values(haplotypeGroups)

  if (sortBy === 'similarity_score') {
    sortBySimilarity(groups)
  } else if (sortBy === 'sample_count') {
    groups.sort((a, b) => b.samples.length - a.samples.length)
  } else {
    groups.sort((a, b) => b.variants.variants.length - a.variants.variants.length)
  }

  return { groups }
}

/**
 * Sort groups by aggregate pairwise similarity.
 * Uses Set<position> for O(|A|) intersection instead of O(|A|×|B|) filter+some.
 */
function sortBySimilarity(groups: any[]) {
  if (groups.length <= 1) return

  // Pre-compute position sets for each group
  const positionSets: Set<number>[] = groups.map(
    (g) => new Set(g.variants.variants.map((v: any) => v.pos))
  )

  // Compute similarity scores: sum of (|intersection| / max(|A|,|B|)) for each pair
  const scores = new Float64Array(groups.length)

  for (let i = 0; i < groups.length; i++) {
    const setA = positionSets[i]
    const sizeA = setA.size
    let totalScore = 0

    for (let j = 0; j < groups.length; j++) {
      if (i === j) continue
      const setB = positionSets[j]
      const sizeB = setB.size
      const maxSize = Math.max(sizeA, sizeB)
      if (maxSize === 0) continue

      // Count intersection by iterating the smaller set
      let common = 0
      if (sizeA <= sizeB) {
        for (const pos of setA) {
          if (setB.has(pos)) common++
        }
      } else {
        for (const pos of setB) {
          if (setA.has(pos)) common++
        }
      }

      totalScore += common / maxSize
    }

    scores[i] = totalScore
  }

  // Sort by score descending
  const indices = Array.from({ length: groups.length }, (_, i) => i)
  indices.sort((a, b) => scores[b] - scores[a])

  // Reorder in place
  const sorted = indices.map((i) => groups[i])
  for (let i = 0; i < groups.length; i++) {
    groups[i] = sorted[i]
  }
}

/**
 * Assemble haplotype groups from CH-side pre-grouped results (two-query approach).
 * Q1 provides group assignments (readable_id → carriers), Q2 provides distinct variant details.
 * This replaces the heavy JS-side grouping with simple map lookups.
 */
export type TrvCarrierRow = {
  position: string
  ref: string
  alt: string
  sample_id: string
  strand: number
}

export const assembleHaplotypeGroups = (
  groupAssignments: Array<{
    readable_id: string
    carriers: Array<[string, number]>
    sample_count: string
  }>,
  distinctVariants: any[],
  chrom: string,
  minAlleleFreq: number,
  sortBy: string = 'similarity_score',
  trvCarriers: TrvCarrierRow[] = [],
  clusterThreshold?: number,
  regionStart?: number,
  regionStop?: number
) => {
  // Step 1: Build variant map keyed by "chrom-pos:ref-alt"
  const variantMap = new Map<string, LRVariant>()
  for (const row of distinctVariants) {
    const pos = Number(row.position)
    const af = Number(row.info_AF)
    const toNum = (v: any) => v != null ? Number(v) : null
    const toStr = (v: any) => v || null
    const key = `${chrom}-${pos}:${row.ref}-${row.alt}`
    const variant = buildVariant(
      chrom, pos,
      row.ref, row.alt, row.rsid,
      af, Number(row.info_AC), Number(row.info_AN),
      row.allele_type, Number(row.allele_length),
      toNum(row.info_AF_afr), toNum(row.info_AF_amr), toNum(row.info_AF_eas),
      toNum(row.info_AF_nfe), toNum(row.info_AF_sas),
      toNum(row.cadd_phred), toNum(row.phylop),
      row.sv_consequences && row.sv_consequences.length > 0 ? row.sv_consequences : null,
      toStr(row.dbgap_id),
      toStr(row.tr_id), toStr(row.tr_motifs), toStr(row.tr_struc),
      toNum(row.allele_methylation),
      row.motif_counts && row.motif_counts.length > 0 ? row.motif_counts : null,
      toNum(row.allele_purity),
    )
    variantMap.set(key, variant)
  }

  // Step 1b: Build TRV carrier lookup: (sampleId:strand) → position → alt
  const trvAltMap = new Map<string, Map<number, string>>()
  for (const row of trvCarriers) {
    const carrierKey = `${row.sample_id}:${row.strand}`
    let posMap = trvAltMap.get(carrierKey)
    if (!posMap) {
      posMap = new Map()
      trvAltMap.set(carrierKey, posMap)
    }
    posMap.set(Number(row.position), row.alt)
  }

  // Step 2: Build carrier→groupIndex reverse index
  const carrierToGroup = new Map<string, number>()
  for (let gi = 0; gi < groupAssignments.length; gi++) {
    const ga = groupAssignments[gi]
    for (const [sampleId, strand] of ga.carriers) {
      carrierToGroup.set(`${sampleId}:${strand}`, gi)
    }
  }

  // Step 3: Assemble base groups from group assignments
  const groups: any[] = []
  for (const ga of groupAssignments) {
    const variantKeys = ga.readable_id.split(';')
    const aboveThreshold: LRVariant[] = []
    for (const key of variantKeys) {
      const v = variantMap.get(key)
      if (v) aboveThreshold.push(v)
    }

    if (aboveThreshold.length === 0) continue

    const readableId = ga.readable_id
    const groupHash = hashString(readableId)

    const hasTrv = aboveThreshold.some((v) => v.allele_type === 'trv')
    const samples = ga.carriers.map(([sampleId, strand]) => {
      let variants = aboveThreshold
      if (hasTrv && trvAltMap.size > 0) {
        const posMap = trvAltMap.get(`${sampleId}:${strand}`)
        if (posMap) {
          variants = aboveThreshold.map((v) => {
            if (v.allele_type !== 'trv') return v
            const carrierAlt = posMap.get(v.pos)
            if (carrierAlt && carrierAlt !== v.alt) {
              return { ...v, alt: carrierAlt }
            }
            return v
          })
        }
      }
      return {
        sample_id: sampleId,
        variant_sets: [{ variants, readable_id: readableId }],
      }
    })

    groups.push({
      samples,
      variants: { variants: aboveThreshold, readable_id: readableId },
      below_threshold: { variants: [] as any[], readable_id: '' },
      start: Math.min(...aboveThreshold.map((v) => v.pos)),
      stop: Math.max(...aboveThreshold.map((v) => v.pos)),
      readable_id: readableId,
      hash: groupHash,
    })
  }

  // Step 4: Distribute below-threshold variants
  // For each variant below AF threshold, find which groups its carriers belong to
  // and add the variant to those groups' below_threshold arrays
  for (const row of distinctVariants) {
    const af = Number(row.info_AF)
    if (af >= minAlleleFreq) continue

    const varPos = Number(row.position)
    const key = `${chrom}-${varPos}:${row.ref}-${row.alt}`
    const variant = variantMap.get(key)
    if (!variant) continue

    const carriers: Array<[string, number]> = row.carriers || []
    // Group carriers by their group index, collecting sample_ids per group
    const groupSamples = new Map<number, string[]>()
    for (const [sampleId, strand] of carriers) {
      const gi = carrierToGroup.get(`${sampleId}:${strand}`)
      if (gi === undefined) continue
      let arr = groupSamples.get(gi)
      if (!arr) {
        arr = []
        groupSamples.set(gi, arr)
      }
      arr.push(sampleId)
    }

    for (const [gi, sampleIds] of groupSamples) {
      groups[gi].below_threshold.variants.push({
        ...variant,
        in_samples: sampleIds,
      })
    }
  }

  // Step 5: Sort
  if (sortBy === 'similarity_score') {
    sortBySimilarity(groups)
  } else if (sortBy === 'sample_count') {
    groups.sort((a, b) => b.samples.length - a.samples.length)
  } else {
    groups.sort((a, b) => b.variants.variants.length - a.variants.variants.length)
  }

  // Step 6: Clustering (optional — only if clusterThreshold is provided)
  if (clusterThreshold == null || groups.length < 2) {
    return { groups, variantMap }
  }

  const cacheKey = `${chrom}:${regionStart ?? 0}-${regionStop ?? 0}`

  // Fetch or build UPGMA tree
  let treeResult = upgmaTreeCache.get(cacheKey)
  if (!treeResult) {
    const distMatrix = computeSVDistanceMatrix(groups)
    treeResult = buildUPGMATree(distMatrix, groups)
    cacheTree(cacheKey, treeResult)
  }

  const { tree } = treeResult

  // Cut tree at threshold
  const clusterNodes = getClustersAtThreshold(tree, clusterThreshold)

  // Build a hash→group lookup for fast access
  const groupByHash = new Map<string, any>()
  for (const g of groups) {
    groupByHash.set(g.hash, g)
  }

  // Compute consensus for each cluster
  const clusters = clusterNodes.map((clusterNode, idx) => {
    const memberHashes = getLeafGroupHashes(clusterNode)
    const memberGroups = memberHashes
      .map((h) => groupByHash.get(h))
      .filter((g): g is any => g != null)

    const sampleCount = memberGroups.reduce(
      (sum: number, g: any) => sum + g.samples.length,
      0
    )

    // Tally variant occurrences across member groups, weighted by sample count
    const variantTally = new Map<string, { variant: LRVariant; count: number }>()
    for (const g of memberGroups) {
      const weight = g.samples.length
      for (const v of g.variants.variants as LRVariant[]) {
        const existing = variantTally.get(v.variant_id)
        if (existing) {
          existing.count += weight
        } else {
          variantTally.set(v.variant_id, { variant: v, count: weight })
        }
      }
    }

    const consensusVariants = Array.from(variantTally.values()).map(
      ({ variant, count }) => ({
        variant,
        cluster_af: sampleCount > 0 ? count / sampleCount : 0,
      })
    )

    return {
      cluster_id: `cluster_${idx}`,
      sample_count: sampleCount,
      member_group_hashes: memberHashes,
      consensus_variants: consensusVariants,
    }
  })

  return {
    groups,
    clusters,
    tree_json: JSON.stringify(tree),
    variantMap,
  }
}

// --- Legacy exports (used by mQTL and potentially other code paths) ---

export const reconstructSamplesFromVariants = (docs: any[]) => {
  const groupedBySample: Record<string, any[]> = {}
  for (const doc of docs) {
    const sid = doc.sample_id
    if (!groupedBySample[sid]) groupedBySample[sid] = []
    groupedBySample[sid].push(doc)
  }

  return Object.keys(groupedBySample).map((sample_id) => {
    const sampleDocs = groupedBySample[sample_id]
    const strand1 = sampleDocs.filter((d: any) => d.strand === 1).map((d: any) => ({
      ...d,
      variant_id: d.variant_id || `${d.chrom}:${d.pos || d.position}`,
    }))
    const strand2 = sampleDocs.filter((d: any) => d.strand === 2).map((d: any) => ({
      ...d,
      variant_id: d.variant_id || `${d.chrom}:${d.pos || d.position}`,
    }))

    return {
      sample_id,
      variant_sets: [
        {
          variants: strand1,
          readable_id: strand1
            .map((v: any) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
            .sort()
            .join(';'),
        },
        {
          variants: strand2,
          readable_id: strand2
            .map((v: any) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
            .sort()
            .join(';'),
        },
      ],
    }
  })
}

export const createHaplotypeGroups = (
  samples: any[],
  start: number,
  stop: number,
  minAlleleFreq: number = 0,
  sortBy: string = 'similarity_score'
) => {
  const haplotypeGroups: Record<string, any> = {}

  samples.forEach((sample) => {
    sample.variant_sets.forEach((vs: any) => {
      const filteredVariants = vs.variants.filter(
        (v: any) => v.pos >= start && v.pos <= stop
      )
      const aboveThreshold: any[] = []
      const belowThreshold: any[] = []

      filteredVariants.forEach((v: any) => {
        const afPasses = v.freq && v.freq.af >= minAlleleFreq
        if (afPasses) aboveThreshold.push(v)
        else belowThreshold.push({ ...v, in_samples: [sample.sample_id] })
      })

      if (aboveThreshold.length > 0) {
        const readableId = aboveThreshold
          .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
          .sort()
          .join(';')
        const groupHash = hashString(readableId)

        if (!haplotypeGroups[groupHash]) {
          haplotypeGroups[groupHash] = {
            samples: [sample],
            variants: { variants: aboveThreshold, readable_id: readableId },
            below_threshold: { variants: belowThreshold, readable_id: '' },
            start: Math.min(...aboveThreshold.map((v: any) => v.pos)),
            stop: Math.max(...aboveThreshold.map((v: any) => v.pos)),
            readable_id: readableId,
            hash: groupHash,
          }
        } else {
          haplotypeGroups[groupHash].samples.push(sample)
          belowThreshold.forEach((v) => {
            const existing = haplotypeGroups[groupHash].below_threshold.variants.find(
              (ev: any) => ev.pos === v.pos
            )
            if (existing) existing.in_samples.push(sample.sample_id)
            else haplotypeGroups[groupHash].below_threshold.variants.push(v)
          })
        }
      }
    })
  })

  let groups = Object.values(haplotypeGroups)

  if (sortBy === 'similarity_score') {
    sortBySimilarity(groups)
  } else if (sortBy === 'sample_count') {
    groups.sort((a, b) => b.samples.length - a.samples.length)
  } else {
    groups.sort((a, b) => b.variants.variants.length - a.variants.variants.length)
  }

  return { groups }
}
