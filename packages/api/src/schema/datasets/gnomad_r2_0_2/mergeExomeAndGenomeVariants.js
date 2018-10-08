const add = (n1, n2) => (n1 || 0) + (n2 || 0)

const mergeExomeAndGenomeVariants = (exomeVariants, genomeVariants) => {
  const merged = []
  while (exomeVariants.length || genomeVariants.length) {
    const currentExomeVariant = exomeVariants[0]
    const currentGenomeVariant = genomeVariants[0]

    if (currentGenomeVariant === undefined) {
      merged.push({
        ...exomeVariants.shift(),
        datasets: ['gnomadExomeVariants'],
      })
    } else if (currentExomeVariant === undefined) {
      merged.push({
        ...genomeVariants.shift(),
        datasets: ['gnomadGenomeVariants'],
      })
    } else if (currentExomeVariant.pos < currentGenomeVariant.pos) {
      merged.push({
        ...exomeVariants.shift(),
        datasets: ['gnomadExomeVariants'],
      })
    } else if (currentGenomeVariant.pos < currentExomeVariant.pos) {
      merged.push({
        ...genomeVariants.shift(),
        datasets: ['gnomadGenomeVariants'],
      })
    } else {
      const currentPosition = currentExomeVariant.pos

      const exomeVariantsAtThisPosition = []
      while (exomeVariants.length && exomeVariants[0].pos === currentPosition) {
        exomeVariantsAtThisPosition.push(exomeVariants.shift())
      }
      const genomeVariantsAtThisPosition = []
      while (genomeVariants.length && genomeVariants[0].pos === currentPosition) {
        genomeVariantsAtThisPosition.push(genomeVariants.shift())
      }
      exomeVariantsAtThisPosition.sort((v1, v2) => v1.variant_id.localeCompare(v2.variant_id))
      genomeVariantsAtThisPosition.sort((v1, v2) => v1.variant_id.localeCompare(v2.variant_id))

      while (exomeVariantsAtThisPosition.length || genomeVariantsAtThisPosition.length) {
        const currentExomeVariantAtThisPosition = exomeVariantsAtThisPosition[0]
        const currentGenomeVariantAtThisPosition = genomeVariantsAtThisPosition[0]

        if (currentGenomeVariantAtThisPosition === undefined) {
          merged.push({
            ...exomeVariantsAtThisPosition.shift(),
            datasets: ['gnomadExomeVariants'],
          })
        } else if (currentExomeVariantAtThisPosition === undefined) {
          merged.push({
            ...genomeVariantsAtThisPosition.shift(),
            datasets: ['gnomadGenomeVariants'],
          })
        } else if (
          currentExomeVariantAtThisPosition.variant_id <
          currentGenomeVariantAtThisPosition.variant_id
        ) {
          merged.push({
            ...exomeVariantsAtThisPosition.shift(),
            datasets: ['gnomadExomeVariants'],
          })
        } else if (
          currentGenomeVariantAtThisPosition.variant_id <
          currentExomeVariantAtThisPosition.variant_id
        ) {
          merged.push({
            ...genomeVariantsAtThisPosition.shift(),
            datasets: ['gnomadGenomeVariants'],
          })
        } else {
          merged.push({
            ...currentExomeVariantAtThisPosition,
            allele_count: add(
              currentExomeVariantAtThisPosition.allele_count,
              currentGenomeVariantAtThisPosition.allele_count
            ),
            allele_num: add(
              currentExomeVariantAtThisPosition.allele_num,
              currentGenomeVariantAtThisPosition.allele_num
            ),
            hom_count: add(
              currentExomeVariantAtThisPosition.hom_count,
              currentGenomeVariantAtThisPosition.hom_count
            ),
            hemi_count: add(
              currentExomeVariantAtThisPosition.hemi_count,
              currentGenomeVariantAtThisPosition.hemi_count
            ),
            filters: currentExomeVariantAtThisPosition.filters.concat(
              currentGenomeVariantAtThisPosition.filters
            ),
            datasets: ['gnomadExomeVariants', 'gnomadGenomeVariants'],
          })
          exomeVariantsAtThisPosition.shift()
          genomeVariantsAtThisPosition.shift()
        }
      }
    }
  }
  return merged
}

export default mergeExomeAndGenomeVariants
