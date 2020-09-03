import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { flatMap, uniqBy } from 'lodash'

import { normalizeVariantId, parseRegionId } from '@gnomad/identifiers'

import datasetsConfig from '../datasets/datasetsConfig'
import { UserVisibleError } from '../errors'

export const SearchResultType = new GraphQLObjectType({
  name: 'SearchResult',
  fields: {
    label: { type: new GraphQLNonNull(GraphQLString) },
    url: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export const resolveSearchResults = async (ctx, dataset, query) => {
  if (dataset !== 'gnomad_r2_1' && dataset !== 'gnomad_r3') {
    throw new UserVisibleError(
      `Search is not supported for dataset "${datasetsConfig[dataset].label}"`
    )
  }

  try {
    const variantId = normalizeVariantId(query)
    return [
      {
        label: variantId,
        url: `/variant/${variantId}?dataset=${dataset}`,
      },
    ]
  } catch (err) {} // eslint-disable-line no-empty

  try {
    const { chrom, start, stop } = parseRegionId(query)
    const regionId = `${chrom}-${start}-${stop}`

    const results = [
      {
        label: regionId,
        url: `/region/${regionId}?dataset=${dataset}`,
      },
    ]

    // If a position is entered, return options for a 40 base region centered
    // at the position and the position as a one base region.
    if (/^(chr)?(\d+|x|y|m|mt)[-:.]([\d,]+)$/i.test(query)) {
      const windowRegionId = `${chrom}-${Math.max(1, start - 20)}-${stop + 20}`
      results.unshift({
        label: windowRegionId,
        url: `/region/${windowRegionId}?dataset=${dataset}`,
      })
    }

    return results
  } catch (err) {} // eslint-disable-line no-empty

  const upperCaseQuery = query.toUpperCase()

  const gencodeVersion =
    dataset === 'gnomad_r3'
      ? process.env.GRCH38_GENCODE_VERSION || 'v29'
      : process.env.GRCH37_GENCODE_VERSION || 'v19'

  if (/^ENSG[0-9]/.test(upperCaseQuery)) {
    const geneIdSearchResponse = await ctx.database.elastic.search({
      index: 'genes',
      type: 'documents',
      _source: ['gene_id', 'symbol'],
      body: {
        query: {
          bool: {
            must: { prefix: { gene_id: upperCaseQuery } },
            // Gene must exist in the version of Gencode for the selected dataset
            filter: { exists: { field: `gencode.${gencodeVersion}.gene_symbol` } },
          },
        },
      },
      size: 5,
    })

    if (geneIdSearchResponse.hits.total === 0) {
      return []
    }

    return geneIdSearchResponse.hits.hits.map(hit => {
      const gene = hit._source
      return {
        label: `${gene.gene_id} (${gene.symbol})`,
        url: `/gene/${gene.gene_id}?dataset=${dataset}`,
      }
    })
  }

  if (/^ENST[0-9]/.test(upperCaseQuery)) {
    const transcriptIdSearchResponse = await ctx.database.elastic.search({
      index: 'genes',
      type: 'documents',
      body: {
        query: {
          nested: {
            path: `gencode.${gencodeVersion}.transcripts`,
            query: {
              prefix: { [`gencode.${gencodeVersion}.transcripts.transcript_id`]: upperCaseQuery },
            },
          },
        },
      },
      size: 5,
    })

    if (transcriptIdSearchResponse.hits.total === 0) {
      return []
    }

    // Change this to use nested_hits?
    const genes = transcriptIdSearchResponse.hits.hits.map(hit => hit._source)
    const transcripts = flatMap(genes, gene =>
      gene.gencode[gencodeVersion].transcripts.filter(transcript =>
        transcript.transcript_id.startsWith(upperCaseQuery)
      )
    )

    return transcripts.map(transcript => ({
      label: `${transcript.transcript_id}`,
      url: `/transcript/${transcript.transcript_id}?dataset=${dataset}`,
    }))
  }

  const geneSymbolSearchResponse = await ctx.database.elastic.search({
    index: 'genes',
    type: 'documents',
    _source: ['gene_id', 'symbol'],
    body: {
      query: {
        bool: {
          must: {
            bool: {
              should: [
                { term: { symbol_upper_case: upperCaseQuery } },
                { prefix: { search_terms: upperCaseQuery } },
              ],
            },
          },
          // Gene must exist in the version of Gencode for the selected dataset
          filter: { exists: { field: `gencode.${gencodeVersion}.gene_symbol` } },
        },
      },
    },
    size: 5,
  })

  const matchingGenes =
    geneSymbolSearchResponse.hits.total > 0
      ? geneSymbolSearchResponse.hits.hits.map(hit => hit._source)
      : []

  const geneNameCounts = {}
  matchingGenes.forEach(gene => {
    if (geneNameCounts[gene.symbol] === undefined) {
      geneNameCounts[gene.symbol] = 0
    }
    geneNameCounts[gene.symbol] += 1
  })

  const geneResults = matchingGenes.map(gene => ({
    label: geneNameCounts[gene.symbol] > 1 ? `${gene.symbol} (${gene.gene_id})` : gene.symbol,
    url: `/gene/${gene.gene_id}?dataset=${dataset}`,
  }))

  if (geneResults.length < 5 && /^rs[0-9]/i.test(query)) {
    const variantIndex =
      dataset === 'gnomad_r3' ? 'gnomad_r3_variants' : 'gnomad_exomes_2_1_1,gnomad_genomes_2_1_1'
    const variantType = dataset === 'gnomad_r3' ? 'documents' : 'variant'

    const variantSearchResponse = await ctx.database.elastic.search({
      index: variantIndex,
      type: variantType,
      _source: ['rsid', 'variant_id'],
      body: {
        query: {
          term: { rsid: query.toLowerCase() },
        },
      },
      size: 10,
    })

    // Since variant search queries two indices, the same variant may be returned twice.
    // De-duplicate based on variant ID.
    const variantResults = uniqBy(
      variantSearchResponse.hits.hits.map(doc => doc._source),
      variant => variant.variant_id
    ).map(variant => ({
      label: `${variant.variant_id} (${variant.rsid})`,
      url: `/variant/${variant.variant_id}?dataset=${dataset}`,
    }))

    return geneResults.concat(variantResults)
  }

  return geneResults
}
