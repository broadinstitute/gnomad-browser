// safe math on possibly null values
const add = (n1, n2) => (n1 || 0) + (n2 || 0)

const mergeExomeAndGenomeData = variants =>
  variants.map(variant => {
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
      populations: exome.populations.map((_, i) => ({
        id: exome.populations[i].id.toUpperCase(),
        ac: exome.populations[i].ac + genome.populations[i].ac,
        an: exome.populations[i].an + genome.populations[i].an,
        ac_hemi: exome.populations[i].ac_hemi + genome.populations[i].ac_hemi,
        ac_hom: exome.populations[i].ac_hom + genome.populations[i].ac_hom,
      })),
    }
  })

export default mergeExomeAndGenomeData
