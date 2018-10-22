import POPULATIONS from './populations'

// safe math on possibly null values
const add = (n1, n2) => (n1 || 0) + (n2 || 0)

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
          const combinedAC = add(
            currentExomeVariantAtThisPosition.ac,
            currentGenomeVariantAtThisPosition.ac
          )
          const combinedAN = add(
            currentExomeVariantAtThisPosition.an,
            currentGenomeVariantAtThisPosition.an
          )

          mergedVariants.push({
            ...currentExomeVariantAtThisPosition,
            ac: combinedAC,
            an: combinedAN,
            af: combinedAN ? combinedAC / combinedAN : 0,
            ac_hemi: add(
              currentExomeVariantAtThisPosition.ac_hemi,
              currentGenomeVariantAtThisPosition.ac_hemi
            ),
            ac_hom: add(
              currentExomeVariantAtThisPosition.ac_hom,
              currentGenomeVariantAtThisPosition.ac_hom
            ),
            filters: currentExomeVariantAtThisPosition.filters.concat(
              currentGenomeVariantAtThisPosition.filters
            ),
            datasets: currentExomeVariantAtThisPosition.datasets.concat(
              currentGenomeVariantAtThisPosition.datasets
            ),
            populations: POPULATIONS.map((popId, i) => ({
              id: popId.toUpperCase(),
              ac:
                currentExomeVariantAtThisPosition.populations[i].ac +
                currentGenomeVariantAtThisPosition.populations[i].ac,
              an:
                currentExomeVariantAtThisPosition.populations[i].an +
                currentGenomeVariantAtThisPosition.populations[i].an,
              ac_hemi:
                currentExomeVariantAtThisPosition.populations[i].ac_hemi +
                currentGenomeVariantAtThisPosition.populations[i].ac_hemi,
              ac_hom:
                currentExomeVariantAtThisPosition.populations[i].ac_hom +
                currentGenomeVariantAtThisPosition.populations[i].ac_hom,
            })),
          })

          exomeVariantsAtThisPosition.shift()
          genomeVariantsAtThisPosition.shift()
        }
      }
    }
  }

  return mergedVariants
}

export default mergeExomeAndGenomeVariantSummaries
