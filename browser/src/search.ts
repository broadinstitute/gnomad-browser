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
import { isLongReadVariantId } from '@gnomad/dataset-metadata/longReadVariantId'
import { parseTrLocusId } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { formatLongReadVariantId } from './LongReadVariantPage/formatLongReadVariantId'

export type SearchOptions = {
  lrCohort?: 'hgsvc_hprc' | 'aou'
}

type SearchResultKind =
  | 'gene'
  | 'region'
  | 'variant'
  | 'tandem-repeat'
  | 'transcript'
  | 'variant-cooccurrence'

const longReadCompatibleResultKinds = new Set<SearchResultKind>([
  'gene',
  'region',
  'variant',
  'tandem-repeat',
])

export const getSearchDatasetForSelectedDataset = (selectedDataset: unknown): DatasetId => {
  if (typeof selectedDataset === 'string') {
    // Long reads are a distinct r4 dataset, so this exact match must precede the r4 family.
    if (selectedDataset === 'gnomad_r4_lr') {
      return 'gnomad_r4_lr'
    }
    if (selectedDataset.startsWith('gnomad_r4')) {
      return 'gnomad_r4'
    }
    if (selectedDataset.startsWith('gnomad_r3')) {
      return 'gnomad_r3'
    }
    if (selectedDataset.startsWith('gnomad_r2')) {
      return 'gnomad_r2_1'
    }
    if (selectedDataset.startsWith('gnomad_sv_r2')) {
      return 'gnomad_sv_r2_1'
    }
    if (selectedDataset === 'exac') {
      return 'exac'
    }
    if (selectedDataset === 'gnomad_sv_r4') {
      return 'gnomad_sv_r4'
    }
    if (selectedDataset === 'gnomad_cnv_r4') {
      return 'gnomad_cnv_r4'
    }
  }
  return 'gnomad_r4'
}

const searchResultUrl = (
  pathname: string,
  datasetId: DatasetId,
  resultKind: SearchResultKind,
  options: SearchOptions,
  additionalParams: [string, string][] = []
) => {
  // Gene, region, and variant pages support the LR dataset. Other result pages (currently
  // transcript and variant co-occurrence) fall back to the matching r4 short-read dataset.
  const resultDataset =
    datasetId === 'gnomad_r4_lr' && !longReadCompatibleResultKinds.has(resultKind)
      ? 'gnomad_r4'
      : datasetId
  const params = new URLSearchParams({ dataset: resultDataset })
  if (resultDataset === 'gnomad_r4_lr' && options.lrCohort) {
    params.set('lr_cohort', options.lrCohort)
  }
  additionalParams.forEach(([key, value]) => params.append(key, value))
  return `${pathname}?${params.toString()}`
}

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
  startingGeneSymbolCounts: Record<string, number> = {},
  options: SearchOptions = {}
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

      value: searchResultUrl(`/gene/${gene.ensembl_id}`, datasetId, 'gene', options),
    }))

  return [formattedGenes, geneSymbolCounts]
}

type SearchResultItem = { label: string; value: string }

export const fetchSearchResults = (
  datasetId: DatasetId,
  query: string,
  options: SearchOptions = {}
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
          value: searchResultUrl(`/variant/${structuralVariantId}`, datasetId, 'variant', options),
        },
      ])
    }
  } else {
    // ==============================================================================================
    // Variants
    // ==============================================================================================

    const trLocus = datasetId === 'gnomad_r4_lr' ? parseTrLocusId(query) : null
    if (trLocus) {
      return Promise.resolve([
        {
          label: `Tandem-repeat locus ${trLocus.canonicalId}`,
          value: searchResultUrl(
            `/tandem-repeat/${trLocus.canonicalId}`,
            datasetId,
            'tandem-repeat',
            options
          ),
        },
      ])
    }

    if (datasetId === 'gnomad_r4_lr' && isLongReadVariantId(query)) {
      return Promise.resolve([
        {
          label: formatLongReadVariantId(query),
          value: searchResultUrl(`/variant/${query}`, datasetId, 'variant', options),
        },
      ])
    }

    if (isVariantId(query)) {
      const variantId = normalizeVariantId(query)
      return Promise.resolve([
        {
          label: variantId,
          value: searchResultUrl(`/variant/${variantId}`, datasetId, 'variant', options),
        },
      ])
    }

    if (isRsId(query)) {
      const rsId = query
      return Promise.resolve([
        {
          label: rsId,
          value: searchResultUrl(`/variant/${rsId}`, datasetId, 'variant', options),
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
        .then((response) =>
          parseGeneSearchResults(response, query, datasetId, { [caid]: 1 }, options)
        )
        .then(([geneSearchResults, geneSymbolCounts]) => {
          const variantItem = {
            label: geneSymbolCounts[caid] > 1 ? `${caid} (variant)` : caid,
            value: searchResultUrl(`/variant/${caid}`, datasetId, 'variant', options),
          }

          return [variantItem, ...geneSearchResults]
        })
    }

    if (/^[0-9]+$/.test(query)) {
      const clinvarVariationId = query
      return Promise.resolve([
        {
          label: clinvarVariationId,
          value: searchResultUrl(`/variant/${clinvarVariationId}`, datasetId, 'variant', options),
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
        value: searchResultUrl(`/region/${regionId}`, datasetId, 'region', options),
      },
    ]

    // If a position is entered, return options for a 40 base region centered
    // at the position and the position as a one base region.
    if (start === stop) {
      const windowRegionId = `${chrom}-${Math.max(1, start - 20)}-${stop + 20}`
      results.unshift({
        label: windowRegionId,
        value: searchResultUrl(`/region/${windowRegionId}`, datasetId, 'region', options),
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
        value: searchResultUrl(`/gene/${geneId}`, datasetId, 'gene', options),
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
        value: searchResultUrl(`/transcript/${transcriptId}`, datasetId, 'transcript', options),
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
        const [geneSearchResults] = parseGeneSearchResults(response, query, datasetId, {}, options)
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
          value: searchResultUrl(
            '/variant-cooccurrence',
            datasetId,
            'variant-cooccurrence',
            options,
            [
              ['variant', variantOneId],
              ['variant', variantTwoId],
            ]
          ),
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
