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

  // Step 6: Build UPGMA tree (clustering/cutting is done client-side)
  if (groups.length < 2) {
    return { groups, variantMap }
  }

  const cacheKey = `${chrom}:${regionStart ?? 0}-${regionStop ?? 0}`

  let treeResult = upgmaTreeCache.get(cacheKey)
  if (!treeResult) {
    const distMatrix = computeSVDistanceMatrix(groups)
    treeResult = buildUPGMATree(distMatrix, groups)
    cacheTree(cacheKey, treeResult)
  }

  return {
    groups,
    tree_json: JSON.stringify(treeResult.tree),
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

// ---- Struct-of-Arrays (SoA) variant format for compact JSON payloads ----

export type SoAVariants = {
  variant_id: string[]
  chrom: string[]
  pos: number[]
  end: (number | null)[]
  ref: string[]
  alt: string[]
  allele_type: string[]
  allele_length: number[]
  freq_af: number[]
  freq_ac: number[]
  freq_an: number[]
  rsid: string[]
  cadd_phred: (number | null)[]
  phylop: (number | null)[]
  sv_consequences: (string[] | null)[]
  dbgap_id: (string | null)[]
  tr_id: (string | null)[]
  tr_motifs: (string | null)[]
  gnomad_str: (string | null)[]
  allele_methylation: (number | null)[]
  motif_counts: (number[] | null)[]
  allele_purity: (number | null)[]
  populations: Array<{ id: string; af: number }>[]
}

function packVariantsToSoA(variants: LRVariant[]): SoAVariants {
  const n = variants.length
  const soa: SoAVariants = {
    variant_id: new Array(n),
    chrom: new Array(n),
    pos: new Array(n),
    end: new Array(n),
    ref: new Array(n),
    alt: new Array(n),
    allele_type: new Array(n),
    allele_length: new Array(n),
    freq_af: new Array(n),
    freq_ac: new Array(n),
    freq_an: new Array(n),
    rsid: new Array(n),
    cadd_phred: new Array(n),
    phylop: new Array(n),
    sv_consequences: new Array(n),
    dbgap_id: new Array(n),
    tr_id: new Array(n),
    tr_motifs: new Array(n),
    gnomad_str: new Array(n),
    allele_methylation: new Array(n),
    motif_counts: new Array(n),
    allele_purity: new Array(n),
    populations: new Array(n),
  }
  for (let i = 0; i < n; i++) {
    const v = variants[i]
    soa.variant_id[i] = v.variant_id
    soa.chrom[i] = v.chrom
    soa.pos[i] = v.pos
    soa.end[i] = v.end
    soa.ref[i] = v.ref
    soa.alt[i] = v.alt
    soa.allele_type[i] = v.allele_type
    soa.allele_length[i] = v.allele_length
    soa.freq_af[i] = v.freq.af
    soa.freq_ac[i] = v.freq.ac
    soa.freq_an[i] = v.freq.an
    soa.rsid[i] = v.rsid
    soa.cadd_phred[i] = v.cadd_phred
    soa.phylop[i] = v.phylop
    soa.sv_consequences[i] = v.sv_consequences
    soa.dbgap_id[i] = v.dbgap_id || null
    soa.tr_id[i] = v.tr_id || null
    soa.tr_motifs[i] = v.tr_motifs || null
    soa.gnomad_str[i] = v.gnomad_str || null
    soa.allele_methylation[i] = v.allele_methylation ?? null
    soa.motif_counts[i] = v.motif_counts
    soa.allele_purity[i] = v.allele_purity ?? null
    soa.populations[i] = v.populations
  }
  return soa
}

/**
 * Build a compact payload from Q2 (distinct variants with carriers) for client-side computation.
 * Transposes the per-variant carrier arrays into per-carrier variant index arrays.
 * Packs variants into SoA format for smaller JSON payloads.
 */
export const buildVariantsAndCarrierMap = (
  distinctVariants: any[],
  chrom: string,
  trvCarriers: Array<{ position: string; ref: string; alt: string; sample_id: string; strand: number }> = [],
) => {
  const variants: LRVariant[] = []
  for (const row of distinctVariants) {
    const pos = Number(row.position)
    const af = Number(row.info_AF)
    const toNum = (v: any) => v != null ? Number(v) : null
    const toStr = (v: any) => v || null
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
    variants.push(variant)
  }

  // Transpose: for each carrier, collect which variant indices they carry
  const carrierVariantIndices: Record<string, number[]> = {}
  for (let i = 0; i < distinctVariants.length; i++) {
    const carriers: Array<[string, number]> = distinctVariants[i].carriers || []
    for (const [sampleId, strand] of carriers) {
      const key = `${sampleId}:${strand}`
      if (!carrierVariantIndices[key]) {
        carrierVariantIndices[key] = []
      }
      carrierVariantIndices[key].push(i)
    }
  }

  // Build TRV alt map: carrierId → { position → alt }
  const trvAlts: Record<string, Record<number, string>> = {}
  for (const row of trvCarriers) {
    const key = `${row.sample_id}:${row.strand}`
    if (!trvAlts[key]) trvAlts[key] = {}
    trvAlts[key][Number(row.position)] = row.alt
  }

  return {
    variants,
    soa_variants: packVariantsToSoA(variants),
    carrier_variant_indices: carrierVariantIndices,
    trv_alts: trvAlts,
  }
}

// ---- Server-side AutoDefaults (ported from client haplotypeCompute.ts) ----

export type AutoDefaults = {
  floor: number
  ceiling: number
  defaultAf: number
  defaultClusterThreshold: number
  isClusteredView: boolean
}

function getAutoClusterThreshold(regionSize: number): number {
  if (regionSize < 5_000) return 0.20
  if (regionSize < 50_000) return 0.25
  if (regionSize > 1_000_000) return 0.70
  const t = (regionSize - 50_000) / (1_000_000 - 50_000)
  return 0.35 + t * 0.30
}

function countGroupsForAf(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number
): number {
  const passingIndices = new Set<number>()
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].freq.af >= minAf) passingIndices.add(i)
  }
  const signatures = new Set<string>()
  for (const variantIdxs of Object.values(carrierVariantIndices)) {
    const filtered = variantIdxs.filter((i) => passingIndices.has(i))
    if (filtered.length === 0) continue
    signatures.add(filtered.join(','))
  }
  return signatures.size
}

function groupCarriersForDefaults(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number
): any[] {
  const passingIndices = new Set<number>()
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].freq.af >= minAf) passingIndices.add(i)
  }

  const signatureToCarriers = new Map<string, string[]>()
  const signatureToIndices = new Map<string, number[]>()

  for (const [carrierId, variantIdxs] of Object.entries(carrierVariantIndices)) {
    const filtered = variantIdxs.filter((i) => passingIndices.has(i))
    if (filtered.length === 0) continue
    const signature = filtered.join(',')
    const existing = signatureToCarriers.get(signature)
    if (existing) {
      existing.push(carrierId)
    } else {
      signatureToCarriers.set(signature, [carrierId])
      signatureToIndices.set(signature, filtered)
    }
  }

  const groups: any[] = []
  for (const [signature, carriers] of signatureToCarriers) {
    const indices = signatureToIndices.get(signature)!
    const aboveVariants = indices.map((i) => variants[i])
    const readableId = aboveVariants
      .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')
    groups.push({
      samples: carriers.map((c) => ({ sample_id: c.split(':')[0] })),
      variants: { variants: aboveVariants, readable_id: readableId },
      hash: hashString(readableId),
    })
  }
  return groups
}

function binarySearchAfServer(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  floor: number,
  ceiling: number,
  targetGroups: number
): number {
  let lo = floor
  let hi = ceiling
  let bestAf = floor
  for (let step = 0; step < 8; step++) {
    const mid = Math.pow(10, (Math.log10(lo) + Math.log10(hi)) / 2)
    const groupCount = countGroupsForAf(variants, carrierVariantIndices, mid)
    if (groupCount > targetGroups) lo = mid
    else hi = mid
    bestAf = mid
  }
  return Math.max(bestAf, floor)
}

const TARGET_MIN = 15
const TARGET_MAX = 40
const MAX_GROUPS_FOR_UPGMA = 600

export function deriveAutoDefaults(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  regionSize: number,
  trvAlts?: Record<string, Record<number, string>>
): AutoDefaults {
  if (variants.length === 0) {
    return { floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false }
  }

  const maxAN = variants.reduce((max, v) => Math.max(max, v.freq.an), 0)
  const floor = Math.max(maxAN > 0 ? 2 / maxAN : 0.001, 0.001)
  const sortedAfs = variants.map((v) => v.freq.af).sort((a, b) => a - b)
  const p95idx = Math.floor(sortedAfs.length * 0.95)
  const ceiling = Math.max(Math.min(sortedAfs[p95idx] || 0.95, 0.95), floor + 0.01)

  const baseClusterThreshold = getAutoClusterThreshold(regionSize)

  if (baseClusterThreshold === 0) {
    const defaultAf = binarySearchAfServer(variants, carrierVariantIndices, floor, ceiling, 30)
    return { floor, ceiling, defaultAf, defaultClusterThreshold: 0, isClusteredView: false }
  }

  let minAf = floor
  let clusterThreshold = baseClusterThreshold

  // Limit how far AF can be raised — don't go past 20% of the way to ceiling
  const maxAfBump = Math.pow(10, Math.log10(floor) + (Math.log10(ceiling) - Math.log10(floor)) * 0.2)

  for (let iter = 0; iter < 10; iter++) {
    const groups = groupCarriersForDefaults(variants, carrierVariantIndices, minAf)
    const N = groups.length

    if (N > MAX_GROUPS_FOR_UPGMA) {
      const newAf = Math.pow(10, (Math.log10(minAf) + Math.log10(ceiling)) / 2)
      if (newAf > maxAfBump) break // bail out — accept floor AF with whatever clustering gives us
      minAf = newAf
      continue
    }

    if (N < 2) break

    const distMatrix = computeSVDistanceMatrix(groups)
    const { tree } = buildUPGMATree(distMatrix, groups)
    const clusterNodes = getClustersAtThreshold(tree, clusterThreshold)
    const M = clusterNodes.length

    if (M >= TARGET_MIN && M <= TARGET_MAX) break

    if (M > TARGET_MAX) {
      clusterThreshold = Math.min(1.0, clusterThreshold + 0.05)
      if (clusterThreshold >= 0.95) break // threshold maxed out, stop
    } else {
      const newAf = Math.pow(10, (Math.log10(floor) + Math.log10(minAf)) / 2)
      if (Math.abs(newAf - minAf) < 1e-6) {
        clusterThreshold = Math.max(0, clusterThreshold - 0.05)
        if (clusterThreshold <= 0.05) break
      } else {
        minAf = newAf
      }
    }
  }

  return {
    floor,
    ceiling,
    defaultAf: Math.max(minAf, floor),
    defaultClusterThreshold: clusterThreshold,
    isClusteredView: true,
  }
}
