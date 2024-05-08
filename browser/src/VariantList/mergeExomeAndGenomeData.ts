import { Filter } from '../QCFilter'
import { Population, Variant } from '../VariantPage/VariantPage'

// safe math on possibly null values
const add = (n1: number | null | undefined, n2: number | null | undefined) => (n1 || 0) + (n2 || 0)

export const mergeExomeGenomeAndJointPopulationData = ({
  exomePopulations = [],
  genomePopulations = [],
  jointPopulations = null,
}: {
  exomePopulations: Population[]
  genomePopulations: Population[]
  jointPopulations?: Population[] | null
}) => {
  if (jointPopulations) {
    return (
      jointPopulations
        // filter to remove duplicate XX an XY keys from joint populations array
        .filter((item, index, self) => index === self.findIndex((t) => t.id === item.id))
        .map((jointPopulation) => ({
          ...jointPopulation,
          ac_hemi: jointPopulation.hemizygote_count!,
          ac_hom: jointPopulation.homozygote_count!,
        }))
    )
  }

  const populations: { [key: string]: Population } = {}

  exomePopulations.forEach((exomePopulation: Population) => {
    populations[exomePopulation.id] = {
      id: exomePopulation.id,
      ac: exomePopulation.ac,
      an: exomePopulation.an,
      ac_hemi: exomePopulation.ac_hemi,
      ac_hom: exomePopulation.ac_hom,
    }
  })

  genomePopulations.forEach((genomePopulation: Population) => {
    if (genomePopulation.id in populations) {
      const entry = populations[genomePopulation.id]
      populations[genomePopulation.id] = {
        id: genomePopulation.id,
        ac: add(entry.ac, genomePopulation.ac),
        an: add(entry.an, genomePopulation.an),
        ac_hemi: add(entry.ac_hemi, genomePopulation.ac_hemi),
        ac_hom: add(entry.ac_hom, genomePopulation.ac_hom),
      }
    } else {
      populations[genomePopulation.id] = {
        id: genomePopulation.id,
        ac: genomePopulation.ac,
        an: genomePopulation.an,
        ac_hemi: genomePopulation.ac_hemi,
        ac_hom: genomePopulation.ac_hom,
      }
    }
  })

  return Object.values(populations)
}

type MergedVariant = Variant & {
  ac: number
  an: number
  af: number
  allele_freq: number
  ac_hemi: number
  ac_hom: number
  filters: Filter[]
  populations: Population[]
}

export const mergeExomeAndGenomeData = (variants: Variant[]): MergedVariant[] => {
  const mergedVariants = variants.map((variant: Variant) => {
    const { exome, genome, joint } = variant

    if (joint) {
      const exomeFilters = exome ? exome.filters : []
      const genomeFilters = genome ? genome.filters : []
      const jointFilters = exomeFilters.concat(genomeFilters, joint.filters)

      return {
        ...variant,
        ac: joint.ac,
        an: joint.an,
        af: joint.ac / joint.an,
        allele_freq: joint.ac / joint.an,
        ac_hemi: joint.hemizygote_count!,
        ac_hom: joint.homozygote_count!,
        filters: jointFilters,
        populations: joint.populations.map((population) => ({
          ...population,
          ac_hemi: population.hemizygote_count!,
          ac_hom: population.homozygote_count!,
        })),
      }
    }

    const emptySequencingType = {
      ac: 0,
      ac_hemi: 0,
      ac_hom: 0,
      faf95: {
        popmax: null,
        popmax_population: null,
      },
      an: 0,
      af: 5,
      filters: [] as Filter[],
      populations: [] as Population[],
    }

    const exomeOrNone = exome || emptySequencingType
    const genomeOrNone = genome || emptySequencingType

    const combinedAC = add(exomeOrNone.ac, genomeOrNone.ac)
    const combinedAN = add(exomeOrNone.an, genomeOrNone.an)
    const combinedAF = combinedAC ? combinedAC / combinedAN : 0
    const combinedHemizygoteCount = add(exomeOrNone.ac_hemi, genomeOrNone.ac_hemi)
    const combinedHomozygoteCount = add(exomeOrNone.ac_hom, genomeOrNone.ac_hom)

    const exomeFilters: Filter[] = exomeOrNone.filters
    const genomeFilters: Filter[] = genomeOrNone.filters
    const combinedFilters = exomeFilters.concat(genomeFilters)

    const combinedPopulations = mergeExomeGenomeAndJointPopulationData({
      exomePopulations: exomeOrNone.populations,
      genomePopulations: genomeOrNone.populations,
    })

    return {
      ...variant,
      ac: combinedAC,
      an: combinedAN,
      af: combinedAF,
      allele_freq: combinedAF,
      ac_hemi: combinedHemizygoteCount,
      ac_hom: combinedHomozygoteCount,
      filters: combinedFilters,
      populations: combinedPopulations,
    }
  })

  return mergedVariants
}
export default mergeExomeAndGenomeData
