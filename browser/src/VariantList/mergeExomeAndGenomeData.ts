import { Population, SequencingType } from '../VariantPage/VariantPage'

// safe math on possibly null values
const add = (n1: any, n2: any) => (n1 || 0) + (n2 || 0)

export const mergeExomeAndGenomePopulationData = (
  exome: SequencingType,
  genome: SequencingType
) => {
  const populations: { [key: string]: Population } = {}

  exome.populations.forEach((exomePopulation: Population) => {
    populations[exomePopulation.id] = {
      id: exomePopulation.id,
      ac: exomePopulation.ac,
      an: exomePopulation.an,
      ac_hemi: exomePopulation.ac_hemi,
      ac_hom: exomePopulation.ac_hom,
    }
  })

  genome.populations.forEach((genomePopulation: Population) => {
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

const mergeExomeAndGenomeData = (variants: any) =>
  variants.map((variant: any) => {
    const { exome, genome } = variant
    if (!exome) {
      return {
        ...variant,
        ...variant.genome,
        allele_freq: variant.genome.af, // hack for variant track which expects allele_freq field
      }
    }
    if (!genome) {
      return {
        ...variant,
        ...variant.exome,
        allele_freq: variant.exome.af, // hack for variant track which expects allele_freq field
      }
    }

    const jointAC = variant.joint ? variant.joint.ac : add(exome.ac, genome.ac)
    const jointAN = variant.joint ? variant.joint.an : add(exome.an, genome.an)
    const jointAF = jointAC ? jointAC / jointAN : 0

    const jointHemizygoteCount = variant.joint
      ? variant.joint.hemizygote_count
      : add(exome.ac_hemi, genome.ac_hemi)
    const jointHomozygoteCount = variant.joint
      ? variant.joint.homozygote_count
      : add(exome.ac_hom, genome.ac_hom)

    const exomeAndGenomeFilters = exome.filters.concat(genome.filters)
    const jointFilters = variant.joint
      ? exomeAndGenomeFilters.concat(variant.joint.filters)
      : exomeAndGenomeFilters

    const jointPopulations = variant.join
      ? variant.joint.populations
      : mergeExomeAndGenomePopulationData(exome!, genome!)

    const jointVariantData = {
      ...variant,
      ac: jointAC,
      an: jointAN,
      af: jointAF,
      allele_freq: jointAF, // hack for variant track which expects allele_freq field
      ac_hemi: jointHemizygoteCount,
      ac_hom: jointHomozygoteCount,
      filters: jointFilters,
      populations: jointPopulations,
    }

    return jointVariantData
  })

export default mergeExomeAndGenomeData
