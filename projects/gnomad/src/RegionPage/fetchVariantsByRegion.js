import fetch from 'graphql-fetch'

const fetchVariantsByRegion = (regionId, datasetId) => {
  const [chrom, start, stop] = regionId.split('-')

  const query = `{
    region(start: ${start}, stop: ${stop}, chrom: "${chrom}") {
      ${datasetId}: variants(dataset: ${datasetId}) {
        allele_count: ac
        hemi_count: ac_hemi
        hom_count: ac_hom
        allele_num: an
        allele_freq: af
        consequence
        datasets
        filters
        flags
        hgvs
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

export default fetchVariantsByRegion
