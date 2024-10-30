import {
  isRegionId,
  isVariantId,
  normalizeVariantId,
  parseRegionId,
  isRsId,
} from '@gnomad/identifiers'

import {
  DatasetId,
  ReferenceGenome,
  referenceGenome as getReferenceGenome,
} from '@gnomad/dataset-metadata/metadata'
import { isStructuralVariantId } from './identifiers'

const fetchGeneSymbolSearchResults = (query: string, referenceGenome: ReferenceGenome) => {
  return fetch('/api/', {
    body: JSON.stringify({
      query: `
          query GeneSearch($query: String!, $referenceGenome: ReferenceGenomeId!) {
            gene_search(query: $query, reference_genome: $referenceGenome) {
              ensembl_id
              symbol
            }
          }
        `,
      variables: { query, referenceGenome },
    }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((response) => response.json())
}

type GeneSearchResult = { data: { gene_search: { ensembl_id: string; symbol: string }[] } }

const parseGeneSearchResults = (
  response: GeneSearchResult,
  query: string,
  datasetId: DatasetId,
  startingGeneSymbolCounts: Record<string, number> = {}
): [SearchResultItem[], Record<string, number>] => {
  const genes = response.data.gene_search
  const geneSymbolCounts = { ...startingGeneSymbolCounts }

  genes.forEach((gene) => {
    if (geneSymbolCounts[gene.symbol] === undefined) {
      geneSymbolCounts[gene.symbol] = 0
    }
    geneSymbolCounts[gene.symbol] += 1
  })

  const formattedGenes = genes
    .sort((gene1, gene2) => {
      const symbolPrefix = query.toUpperCase()
      const symbol1 = gene1.symbol.toUpperCase()
      const symbol2 = gene2.symbol.toUpperCase()

      if (symbol1.startsWith(symbolPrefix) && !symbol2.startsWith(symbolPrefix)) {
        return -1
      }

      if (!symbol1.startsWith(symbolPrefix) && symbol2.startsWith(symbolPrefix)) {
        return 1
      }
      return symbol1.localeCompare(symbol2)
    })
    .map((gene) => ({
      label:
        geneSymbolCounts[gene.symbol] > 1 ? `${gene.symbol} (${gene.ensembl_id})` : gene.symbol,

      value: `/gene/${gene.ensembl_id}?dataset=${datasetId}`,
    }))

  return [formattedGenes, geneSymbolCounts]
}

type SearchResultItem = { label: string; value: string }

export const fetchSearchResults = (
  datasetId: DatasetId,
  query: string
): Promise<SearchResultItem[]> => {
  if (datasetId.startsWith('gnomad_sv')) {
    // ==============================================================================================
    // Structural Variants
    // ==============================================================================================

    if (isStructuralVariantId(query, datasetId)) {
      const structuralVariantId = query.toUpperCase()
      return Promise.resolve([
        {
          label: structuralVariantId,
          value: `/variant/${structuralVariantId}?dataset=${datasetId}`,
        },
      ])
    }
  } else {
    // ==============================================================================================
    // Variants
    // ==============================================================================================

    if (isVariantId(query)) {
      const variantId = normalizeVariantId(query)
      return Promise.resolve([
        {
          label: variantId,
          value: `/variant/${variantId}?dataset=${datasetId}`,
        },
      ])
    }

    if (isRsId(query)) {
      const rsId = query
      return Promise.resolve([
        {
          label: rsId,
          value: `/variant/${rsId}?dataset=${datasetId}`,
        },
      ])
    }

    // Some gene symbols also match the format for variant CAIDs, so we have
    // to cover that as a special case
    if (/^CA[0-9]+$/i.test(query)) {
      const caid = query.toUpperCase()
      return fetchGeneSymbolSearchResults(query, getReferenceGenome(datasetId))
        .then((response) => {
          if (!response?.data?.gene_search) {
            return []
          }
          return response
        })
        .then((response) => parseGeneSearchResults(response, query, datasetId, { [caid]: 1 }))
        .then(([geneSearchResults, geneSymbolCounts]) => {
          const variantItem = {
            label: geneSymbolCounts[caid] > 1 ? `${caid} (variant)` : caid,
            value: `/variant/${caid}?dataset=${datasetId}`,
          }

          return [variantItem, ...geneSearchResults]
        })
    }

    if (/^[0-9]+$/.test(query)) {
      const clinvarVariationId = query
      return Promise.resolve([
        {
          label: clinvarVariationId,
          value: `/variant/${clinvarVariationId}?dataset=${datasetId}`,
        },
      ])
    }
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
        value: `/region/${regionId}?dataset=${datasetId}`,
      },
    ]

    // If a position is entered, return options for a 40 base region centered
    // at the position and the position as a one base region.
    if (start === stop) {
      const windowRegionId = `${chrom}-${Math.max(1, start - 20)}-${stop + 20}`
      results.unshift({
        label: windowRegionId,
        value: `/region/${windowRegionId}?dataset=${datasetId}`,
      })
    }

    return Promise.resolve(results)
  }

  // ==============================================================================================
  // Gene ID
  // ==============================================================================================

  const upperCaseQuery = query.toUpperCase()

  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const geneId = upperCaseQuery
    return Promise.resolve([
      {
        label: geneId,
        value: `/gene/${geneId}?dataset=${datasetId}`,
      },
    ])
  }

  // ==============================================================================================
  // Transcript ID
  // ==============================================================================================

  if (/^ENST\d{11}$/.test(upperCaseQuery)) {
    const transcriptId = upperCaseQuery
    return Promise.resolve([
      {
        label: transcriptId,
        value: `/transcript/${transcriptId}?dataset=${datasetId}`,
      },
    ])
  }

  // ==============================================================================================
  // Gene symbol
  // ==============================================================================================

  if (/^[A-Z][A-Z0-9-]*$/.test(upperCaseQuery)) {
    return fetchGeneSymbolSearchResults(query, getReferenceGenome(datasetId))
      .then((response) => {
        if (!response?.data?.gene_search) {
          throw new Error('Unable to retrieve search results')
        }
        return response
      })
      .then((response) => {
        const [geneSearchResults] = parseGeneSearchResults(response, query, datasetId)
        return geneSearchResults
      })
  }

  // ==============================================================================================
  // Variant co-occurrence
  // ==============================================================================================
  if (/.+\s+AND\s+.+/.test(upperCaseQuery)) {
    const parts = upperCaseQuery.split(/\s+AND\s+/, 2)
    if (isVariantId(parts[0]) && isVariantId(parts[1])) {
      const variantOneId = normalizeVariantId(parts[0])
      const variantTwoId = normalizeVariantId(parts[1])
      return Promise.resolve([
        {
          label: `${variantOneId} and ${variantTwoId} co-occurrence`,
          value: `/variant-cooccurrence?dataset=${datasetId}&variant=${variantOneId}&variant=${variantTwoId}`,
        },
      ])
    }
  }

  return Promise.resolve([])
}

export const fetchVariantSearchResults = (datasetId: any, query: any) => {
  return fetch('/api/', {
    body: JSON.stringify({
      query: `
        query VariantSearch($query: String!, $datasetId: DatasetId!) {
          variant_search(query: $query, dataset: $datasetId) {
            variant_id
          }
        }
      `,
      variables: { datasetId, query },
    }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => response.json())
    .then((response) => {
      if (!response.data.variant_search) {
        throw new Error('Unable to retrieve search results')
      }

      return response.data.variant_search.map((result: any) => result.variant_id)
    })
}
