import { groupBy } from 'lodash'

const addLocus = (doc: any) => ({
  ...doc,
  locus: doc.locus || `${doc.chrom}:${doc.position}`,
})

export const reconstructSamplesFromVariants = (docs: any[]) => {
  const groupedBySample = groupBy(docs, 'sample_id')
  return Object.keys(groupedBySample).map((sample_id) => {
    const sampleDocs = groupedBySample[sample_id]
    const strand1 = sampleDocs.filter((d: any) => d.strand === 1).map(addLocus)
    const strand2 = sampleDocs.filter((d: any) => d.strand === 2).map(addLocus)

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

const hashString = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return hash.toString()
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
    groups.forEach((g1) => {
      g1.similarity_score = groups.reduce((acc, g2) => {
        if (g1 === g2) return acc
        const common = g1.variants.variants.filter((v1: any) =>
          g2.variants.variants.some((v2: any) => v1.position === v2.position)
        )
        const score =
          common.length / Math.max(g1.variants.variants.length, g2.variants.variants.length)
        return acc + score
      }, 0)
    })
    groups.sort((a, b) => b.similarity_score - a.similarity_score)
  } else if (sortBy === 'sample_count') {
    groups.sort((a, b) => b.samples.length - a.samples.length)
  } else {
    groups.sort((a, b) => b.variants.variants.length - a.variants.variants.length)
  }

  return { groups }
}
