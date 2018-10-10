import fetch from 'graphql-fetch'

const fetchVariantsByGene = (geneIdOrName, transcriptId, datasetId) => {
  const geneArg = geneIdOrName.startsWith('ENSG')
    ? `gene_id: "${geneIdOrName}"`
    : `gene_name: "${geneIdOrName}"`

  let variantsArgs = `dataset: ${datasetId}`
  if (transcriptId) {
    variantsArgs += `, transcriptId: "${transcriptId}"`
  }

  const query = `{
    gene(${geneArg}) {
      ${datasetId}: variants(${variantsArgs}) {
        allele_count: ac
        hemi_count: ac_hemi
        hom_count: ac_hom
        allele_num: an
        allele_freq: af
        consequence
        datasets
        filters
        flags
        hgvsc
        hgvsp
        pos
        rsid
        variant_id: variantId
        xpos
      }
    }
  }
  `

  return fetch(process.env.GNOMAD_API_URL)(query)
}

export default fetchVariantsByGene
