const {
  isRegionId,
  isVariantId,
  normalizeVariantId,
  parseRegionId,
  isRsId,
} = require('@gnomad/identifiers')

const { DATASET_REFERENCE_GENOMES } = require('../datasets')

const fetchSearchResults = async (esClient, datasetId, query) => {
  // ==============================================================================================
  // Structural Variants
  // ==============================================================================================

  const STRUCTURAL_VARIANT_ID_REGEX = /^(MCNV|INS|DEL|DUP|CPX|OTH)_(\d+|X|Y)_([1-9][0-9]*)$/i

  const isStructuralVariantId = str => {
    const match = STRUCTURAL_VARIANT_ID_REGEX.exec(str)
    if (!match) {
      return false
    }

    const chrom = match[2]
    const chromNumber = Number(chrom)
    if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
      return false
    }

    const id = Number(match[3])
    if (id > 1e9) {
      return false
    }

    return true
  }

  if (isStructuralVariantId(query)) {
    const structuralVariantId = query.toUpperCase()
    return Promise.resolve([
      {
        label: structuralVariantId,
        value: `/variant/${structuralVariantId}?dataset=${datasetId}`,
      },
    ])
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
    const { chrom, start, stop } = parseRegionId(query)
    const regionId = `${chrom}-${start}-${stop}`
    const results = [
      {
        label: regionId,
        url: `/region/${regionId}?dataset=${datasetId}`,
      },
    ]

    // If a position is entered, return options for a 40 base region centered
    // at the position and the position as a one base region.
    if (start === stop) {
      const windowRegionId = `${chrom}-${Math.max(1, start - 20)}-${stop + 20}`
      results.unshift({
        label: windowRegionId,
        url: `/region/${windowRegionId}?dataset=${datasetId}`,
      })
    }

    return results
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
