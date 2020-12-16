// ================================================================================================
// Variant query
// ================================================================================================

const fetchLofCurationResultsByVariant = async (esClient, variantId) => {
  const response = await esClient.search({
    index: 'gnomad_v2_lof_curation_results',
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id: variantId } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total === 0) {
    return null
  }

  return response.body.hits.hits[0]._source.value.lof_curations
}

// ================================================================================================
// Gene query
// ================================================================================================

const fetchLofCurationResultsByGene = async (esClient, gene) => {
  const response = await esClient.search({
    index: 'gnomad_v2_lof_curation_results',
    type: '_doc',
    size: 1000,
    body: {
      query: {
        bool: {
          filter: {
            term: {
              gene_id: gene.gene_id,
            },
          },
        },
      },
    },
  })

  return response.body.hits.hits.map((doc) => doc._source.value)
}

// ================================================================================================
// Region query
// ================================================================================================

const fetchLofCurationResultsByRegion = async (esClient, region) => {
  const response = await esClient.search({
    index: 'gnomad_v2_lof_curation_results',
    type: '_doc',
    size: 1000,
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': region.chrom } },
            {
              range: {
                'locus.position': {
                  gte: region.start,
                  lte: region.stop,
                },
              },
            },
          ],
        },
      },
    },
  })

  return response.body.hits.hits.map((doc) => doc._source.value)
}

module.exports = {
  fetchLofCurationResultsByVariant,
  fetchLofCurationResultsByGene,
  fetchLofCurationResultsByRegion,
}
