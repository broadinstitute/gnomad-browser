/**
 * Haplotype grouping: takes ClickHouse rows pre-grouped by (sample_id, strand)
 * and clusters them into haplotype groups by shared variant signature.
 *
 * Optimized: ClickHouse does the GROUP BY, and similarity uses Set intersection.
 */

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
}

type Variant = {
  locus: string
  chrom: string
  position: number
  alleles: string[]
  rsid: string
  info_AF: number[]
  info_AC: number
  info_AN: number
  allele_type: string
  allele_length: number
  info_AF_afr: number | null
  info_AF_amr: number | null
  info_AF_eas: number | null
  info_AF_nfe: number | null
  info_AF_sas: number | null
}

function buildVariant(
  chrom: string, pos: number, ref: string, alt: string, rsid: string,
  af: number, ac: number, an: number, alleleType: string, alleleLength: number,
  afAfr: number | null, afAmr: number | null, afEas: number | null,
  afNfe: number | null, afSas: number | null,
): Variant {
  return {
    locus: `${chrom}:${pos}`,
    chrom,
    position: pos,
    alleles: [ref, alt],
    rsid: rsid || '',
    info_AF: [af],
    info_AC: ac,
    info_AN: an,
    allele_type: alleleType || 'snv',
    allele_length: alleleLength || 0,
    info_AF_afr: afAfr,
    info_AF_amr: afAmr,
    info_AF_eas: afEas,
    info_AF_nfe: afNfe,
    info_AF_sas: afSas,
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
    const aboveThreshold: Variant[] = []
    const belowThreshold: Variant[] = []

    for (let i = 0; i < n; i++) {
      const pos = Number(row.positions[i])
      if (pos < start || pos > stop) continue

      const af = Number(row.afs[i])
      const toNum = (v: number | null) => v != null ? Number(v) : null
      const variant = buildVariant(
        chrom, pos,
        row.refs[i], row.alts[i], row.rsids[i],
        af, Number(row.acs[i]), Number(row.ans[i]),
        row.allele_types[i], Number(row.allele_lengths[i]),
        toNum(row.af_afrs?.[i]), toNum(row.af_amrs?.[i]), toNum(row.af_eass?.[i]),
        toNum(row.af_nfes?.[i]), toNum(row.af_sass?.[i]),
      )

      if (af >= minAlleleFreq) {
        aboveThreshold.push(variant)
      } else {
        belowThreshold.push(variant)
      }
    }

    if (aboveThreshold.length === 0) continue

    const readableId = aboveThreshold
      .map((v) => `${v.chrom}-${v.position}:${v.alleles.join('-')}`)
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
        start: Math.min(...aboveThreshold.map((v) => v.position)),
        stop: Math.max(...aboveThreshold.map((v) => v.position)),
        readable_id: readableId,
        hash: groupHash,
      }
    } else {
      haplotypeGroups[groupHash].samples.push(sample)
      for (const v of belowThreshold) {
        const existing = haplotypeGroups[groupHash].below_threshold.variants.find(
          (ev: any) => ev.position === v.position
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
    (g) => new Set(g.variants.variants.map((v: any) => v.position))
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
      locus: d.locus || `${d.chrom}:${d.position}`,
    }))
    const strand2 = sampleDocs.filter((d: any) => d.strand === 2).map((d: any) => ({
      ...d,
      locus: d.locus || `${d.chrom}:${d.position}`,
    }))

    return {
      sample_id,
      variant_sets: [
        {
          variants: strand1,
          readable_id: strand1
            .map((v: any) => `${v.chrom}-${v.position}:${v.alleles.join('-')}`)
            .sort()
            .join(';'),
        },
        {
          variants: strand2,
          readable_id: strand2
            .map((v: any) => `${v.chrom}-${v.position}:${v.alleles.join('-')}`)
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
        (v: any) => v.position >= start && v.position <= stop
      )
      const aboveThreshold: any[] = []
      const belowThreshold: any[] = []

      filteredVariants.forEach((v: any) => {
        const afPasses = v.info_AF && v.info_AF.every((af: number) => af >= minAlleleFreq)
        if (afPasses) aboveThreshold.push(v)
        else belowThreshold.push({ ...v, in_samples: [sample.sample_id] })
      })

      if (aboveThreshold.length > 0) {
        const readableId = aboveThreshold
          .map((v) => `${v.chrom}-${v.position}:${v.alleles.join('-')}`)
          .sort()
          .join(';')
        const groupHash = hashString(readableId)

        if (!haplotypeGroups[groupHash]) {
          haplotypeGroups[groupHash] = {
            samples: [sample],
            variants: { variants: aboveThreshold, readable_id: readableId },
            below_threshold: { variants: belowThreshold, readable_id: '' },
            start: Math.min(...aboveThreshold.map((v) => v.position)),
            stop: Math.max(...aboveThreshold.map((v) => v.position)),
            readable_id: readableId,
            hash: groupHash,
          }
        } else {
          haplotypeGroups[groupHash].samples.push(sample)
          belowThreshold.forEach((v) => {
            const existing = haplotypeGroups[groupHash].below_threshold.variants.find(
              (ev: any) => ev.position === v.position
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
