const mergeExomeAndGenomeVariantSummaries = (exomeVariants, genomeVariants) => {
  const mergedVariants = []

  while (exomeVariants.length || genomeVariants.length) {
    const currentExomeVariant = exomeVariants[0]
    const currentGenomeVariant = genomeVariants[0]

    if (currentGenomeVariant === undefined) {
      mergedVariants.push(exomeVariants.shift())
    } else if (currentExomeVariant === undefined) {
      mergedVariants.push(genomeVariants.shift())
    } else if (currentExomeVariant.pos < currentGenomeVariant.pos) {
      mergedVariants.push(exomeVariants.shift())
    } else if (currentGenomeVariant.pos < currentExomeVariant.pos) {
      mergedVariants.push(genomeVariants.shift())
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

      exomeVariantsAtThisPosition.sort((v1, v2) => v1.variantId.localeCompare(v2.variantId))
      genomeVariantsAtThisPosition.sort((v1, v2) => v1.variantId.localeCompare(v2.variantId))

      while (exomeVariantsAtThisPosition.length || genomeVariantsAtThisPosition.length) {
        const currentExomeVariantAtThisPosition = exomeVariantsAtThisPosition[0]
        const currentGenomeVariantAtThisPosition = genomeVariantsAtThisPosition[0]

        if (currentGenomeVariantAtThisPosition === undefined) {
          mergedVariants.push(exomeVariantsAtThisPosition.shift())
        } else if (currentExomeVariantAtThisPosition === undefined) {
          mergedVariants.push(genomeVariantsAtThisPosition.shift())
        } else if (
          currentExomeVariantAtThisPosition.variantId.localeCompare(
            currentGenomeVariantAtThisPosition.variantId
          ) < 0
        ) {
          mergedVariants.push(exomeVariantsAtThisPosition.shift())
        } else if (
          currentExomeVariantAtThisPosition.variantId.localeCompare(
            currentGenomeVariantAtThisPosition.variantId
          ) > 0
        ) {
          mergedVariants.push(genomeVariantsAtThisPosition.shift())
        } else {
          mergedVariants.push({
            ...exomeVariantsAtThisPosition.shift(),
            genome: genomeVariantsAtThisPosition.shift().genome,
          })
        }
      }
    }
  }

  return mergedVariants
}

export default mergeExomeAndGenomeVariantSummaries
