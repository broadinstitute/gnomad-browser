// ================================================================================================
// Variant query
// ================================================================================================

export const fetchLofCurationResultsByVariant = async (esClient: any, variantId: any) => {
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

export const fetchLofCurationResultsByGene = async (esClient: any, gene: any) => {
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

  return response.body.hits.hits.map((doc: any) => doc._source.value)
}

// ================================================================================================
// Region query
// ================================================================================================

export const fetchLofCurationResultsByRegion = async (esClient: any, region: any) => {
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

  return response.body.hits.hits.map((doc: any) => doc._source.value)
}
