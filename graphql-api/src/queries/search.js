const {
  isRegionId,
  normalizeRegionId,
  isVariantId,
  normalizeVariantId,
  isRsId,
} = require('@gnomad/identifiers')

const { DATASET_LABELS, DATASET_REFERENCE_GENOMES } = require('../datasets')
const { UserVisibleError } = require('../errors')

const fetchSearchResults = async (esClient, datasetId, query) => {
  // TODO: Allow any variant dataset
  if (datasetId !== 'gnomad_r2_1' && datasetId !== 'gnomad_r3') {
    throw new UserVisibleError(`Search is not supported for dataset "${DATASET_LABELS[datasetId]}"`)
  }

  // ==============================================================================================
  // Variants
  // ==============================================================================================

  if (isVariantId(query)) {
    const variantId = normalizeVariantId(query)
    return [
      {
        label: variantId,
        url: `/variant/${variantId}?dataset=${datasetId}`,
      },
    ]
  }

  if (isRsId(query)) {
    const rsId = query
    return [
      {
        label: rsId,
        url: `/variant/${rsId}?dataset=${datasetId}`,
      },
    ]
  }

  // ==============================================================================================
  // Region
  // ==============================================================================================

  if (isRegionId(query)) {
    const regionId = normalizeRegionId(query)
    return [
      {
        label: regionId,
        url: `/region/${regionId}?dataset=${datasetId}`,
      },
    ]
  }

  // ==============================================================================================
  // Gene ID
  // ==============================================================================================

  const upperCaseQuery = query.toUpperCase()

  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const geneId = upperCaseQuery
    return [
      {
        label: geneId,
        url: `/gene/${geneId}?dataset=${datasetId}`,
      },
    ]
  }

  // ==============================================================================================
  // Transcript ID
  // ==============================================================================================

  if (/^ENST\d{11}$/.test(upperCaseQuery)) {
    const transcriptId = upperCaseQuery
    return [
      {
        label: transcriptId,
        url: `/transcript/${transcriptId}?dataset=${datasetId}`,
      },
    ]
  }

  // ==============================================================================================
  // Gene symbol
  // ==============================================================================================

  const referenceGenome = DATASET_REFERENCE_GENOMES[datasetId]
  const geneSymbolSearchResponse = await esClient.search({
    index: `genes_${referenceGenome.toLowerCase()}`,
    type: '_doc',
    _source: ['gene_id', 'value.symbol'],
    body: {
      query: {
        bool: {
          should: [
            { term: { symbol_upper_case: upperCaseQuery } },
            { prefix: { search_terms: upperCaseQuery } },
          ],
        },
      },
    },
    size: 5,
  })

  const matchingGenes =
    geneSymbolSearchResponse.body.hits.total > 0
      ? geneSymbolSearchResponse.body.hits.hits.map((hit) => hit._source)
      : []

  const geneNameCounts = {}
  matchingGenes.forEach((gene) => {
    if (geneNameCounts[gene.value.symbol] === undefined) {
      geneNameCounts[gene.value.symbol] = 0
    }
    geneNameCounts[gene.value.symbol] += 1
  })

  const geneResults = matchingGenes.map((gene) => ({
    label:
      geneNameCounts[gene.value.symbol] > 1
        ? `${gene.value.symbol} (${gene.gene_id})`
        : gene.value.symbol,
    url: `/gene/${gene.gene_id}?dataset=${datasetId}`,
  }))

  return geneResults
}

module.exports = {
  fetchSearchResults,
}
