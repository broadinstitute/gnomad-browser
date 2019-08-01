const fetchClinvarVariantDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'clinvar_grch37',
    type: 'variant',
    _source: ['allele_id', 'alt', 'chrom', 'pos', 'ref', 'variant_id', 'xpos'],
    size: 1,
    body: {
      query: {
        bool: {
          filter: [{ term: { variant_id: variantId } }],
        },
      },
    },
  })

  if (response.hits.hits.length === 0) {
    return null
  }

  const doc = response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle

  return {
    gqlType: 'ClinvarVariantDetails',
    // Variant interface fields
    variantId: doc.variant_id,
    chrom: doc.chrom,
    pos: doc.pos,
    xpos: doc.xpos,
    ref: doc.ref,
    alt: doc.alt,
    // ClinVar specific fields
    allele_id: doc.allele_id,
  }
}

export default fetchClinvarVariantDetails
