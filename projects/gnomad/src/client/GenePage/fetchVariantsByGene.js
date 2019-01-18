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
        ${transcriptId ? '' : 'isCanon: consequence_in_canonical_transcript'}
        datasets
        filters
        flags
        hgvs
        hgvsc
        hgvsp
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
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
