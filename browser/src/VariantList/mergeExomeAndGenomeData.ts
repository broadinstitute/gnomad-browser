import { Population, SequencingType } from '../VariantPage/VariantPage'

// safe math on possibly null values
const add = (n1: any, n2: any) => (n1 || 0) + (n2 || 0)

export const mergeExomeAndGenomePopulationData = (
  exome: SequencingType,
  genome: SequencingType
) => {
  const ancestry_groups: { [key: string]: Population } = {}

  exome.ancestry_groups.forEach((exomePopulation: Population) => {
    ancestry_groups[exomePopulation.id] = {
      id: exomePopulation.id,
      ac: exomePopulation.ac,
      an: exomePopulation.an,
      ac_hemi: exomePopulation.ac_hemi,
      ac_hom: exomePopulation.ac_hom,
    }
  })

  genome.ancestry_groups.forEach((genomePopulation: Population) => {
    if (genomePopulation.id in ancestry_groups) {
      const entry = ancestry_groups[genomePopulation.id]
      ancestry_groups[genomePopulation.id] = {
        id: genomePopulation.id,
        ac: add(entry.ac, genomePopulation.ac),
        an: add(entry.an, genomePopulation.an),
        ac_hemi: add(entry.ac_hemi, genomePopulation.ac_hemi),
        ac_hom: add(entry.ac_hom, genomePopulation.ac_hom),
      }
    } else {
      ancestry_groups[genomePopulation.id] = {
        id: genomePopulation.id,
        ac: genomePopulation.ac,
        an: genomePopulation.an,
        ac_hemi: genomePopulation.ac_hemi,
        ac_hom: genomePopulation.ac_hom,
      }
    }
  })

  return Object.values(ancestry_groups)
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

    const totalAC = add(exome.ac, genome.ac)
    const totalAN = add(exome.an, genome.an)
    const totalAF = totalAN ? totalAC / totalAN : 0

    return {
      ...variant,
      ac: totalAC,
      an: totalAN,
      af: totalAF,
      allele_freq: totalAF, // hack for variant track which expects allele_freq field
      ac_hemi: add(exome.ac_hemi, genome.ac_hemi),
      ac_hom: add(exome.ac_hom, genome.ac_hom),
      filters: exome.filters.concat(genome.filters),
      ancestry_groups: mergeExomeAndGenomePopulationData(exome!, genome!),
    }
  })

export default mergeExomeAndGenomeData
