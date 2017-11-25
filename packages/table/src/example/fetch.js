import fetch from 'graphql-fetch'

const API_URL = process.env.GNOMAD_API_URL

export const fetchVariantsByGene = (geneName, url = API_URL) => {
  const argument = geneName.startsWith('ENSG') ? `gene_id: "${geneName}"` :
    `gene_name: "${geneName}"`
  const query = `{
    gene(${argument}) {
      gnomadExomeVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
        lcr
        segdup
      }
      gnomadGenomeVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
        lcr
        segdup
      }
      exacVariants {
        variant_id
        rsid
        pos
        xpos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        hom_count
        consequence
        lof
      }
    }
}
`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}
