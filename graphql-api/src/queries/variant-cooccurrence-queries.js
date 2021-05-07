const VARIANT_COOCCURRENCE_INDICES = {
  gnomad_r2_1: 'gnomad_v2_variant_cooccurrence',
}

const fetchVariantCooccurrence = async (es, dataset, variantIds) => {
  const response = await es.search({
    index: VARIANT_COOCCURRENCE_INDICES[dataset],
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: [
            { term: { variant_ids: variantIds[0] } },
            { term: { variant_ids: variantIds[1] } },
          ],
        },
      },
    },
    size: 1,
  })

  const results = response.body.hits.hits.map((hit) => hit._source.value)

  if (results.length === 0) {
    return null
  }

  return results[0]
}

module.exports = {
  fetchVariantCooccurrence,
}
