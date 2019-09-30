import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { flatMap, uniqBy } from 'lodash'

export const SearchResultType = new GraphQLObjectType({
  name: 'SearchResult',
  fields: {
    label: { type: new GraphQLNonNull(GraphQLString) },
    url: { type: new GraphQLNonNull(GraphQLString) },
  },
})

const REGION_ID_REGEX = /^(chr)?(\d+|x|y|m|mt)[-:]([0-9]+)([-:]([0-9]+)?)?$/i

export const isRegionId = str => {
  const match = REGION_ID_REGEX.exec(str)
  if (!match) {
    return false
  }

  const chrom = match[2].toLowerCase()
  const chromNumber = Number(chrom)
  if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
    return false
  }

  const start = Number(match[3])
  const end = Number(match[5])

  if (end && end < start) {
    return false
  }

  return true
}

export const normalizeRegionId = regionId => {
  const parts = regionId.split(/[-:]/)
  const chrom = parts[0].toUpperCase().replace(/^CHR/, '')
  let start = Number(parts[1])
  let end

  if (parts[2]) {
    end = Number(parts[2])
  } else {
    end = start + 20
    start = Math.max(start - 20, 0)
  }

  return `${chrom}-${start}-${end}`
}

const VARIANT_ID_REGEX = /^(chr)?(\d+|x|y|m|mt)[-:]([0-9]+)[-:]([acgt]+)[-:]([acgt]+)$/i

export const isVariantId = str => {
  const match = VARIANT_ID_REGEX.exec(str)
  if (!match) {
    return false
  }

  const chrom = match[2].toLowerCase()
  const chromNumber = Number(chrom)
  if (!Number.isNaN(chromNumber) && (chromNumber < 1 || chromNumber > 22)) {
    return false
  }

  return true
}

export const normalizeVariantId = variantId =>
  variantId
    .toUpperCase()
    .replace(/:/g, '-')
    .replace(/^CHR/, '')

export const resolveSearchResults = async (ctx, query) => {
  if (isVariantId(query)) {
    const variantId = normalizeVariantId(query)
    return [
      {
        label: variantId,
        url: `/variant/${variantId}`,
      },
    ]
  }

  if (isRegionId(query)) {
    const regionId = normalizeRegionId(query)
    return [
      {
        label: regionId,
        url: `/region/${regionId}`,
      },
    ]
  }

  const upperCaseQuery = query.toUpperCase()

  if (/^ENSG[0-9]/.test(upperCaseQuery)) {
    const geneIdSearchResponse = await ctx.database.elastic.search({
      index: 'genes',
      type: 'documents',
      _source: ['gene_id', 'symbol'],
      body: {
        query: {
          prefix: {
            gene_id: upperCaseQuery,
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
        url: `/gene/${gene.gene_id}`,
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
            path: 'gencode.v19.transcripts',
            query: {
              prefix: { 'gencode.v19.transcripts.transcript_id': upperCaseQuery },
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
      gene.gencode.v19.transcripts.filter(transcript =>
        transcript.transcript_id.startsWith(upperCaseQuery)
      )
    )

    return transcripts.map(transcript => ({
      label: `${transcript.transcript_id}`,
      url: `/transcript/${transcript.transcript_id}`,
    }))
  }

  const geneSymbolSearchResponse = await ctx.database.elastic.search({
    index: 'genes',
    type: 'documents',
    _source: ['gene_id', 'symbol'],
    body: {
      query: {
        bool: {
          should: [
            {
              term: {
                symbol_upper_case: upperCaseQuery,
              },
            },
            {
              prefix: {
                search_terms: upperCaseQuery,
              },
            },
          ],
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
    url: `/gene/${gene.gene_id}`,
  }))

  if (geneResults.length < 5 && /^rs[0-9]/i.test(query)) {
    const variantSearchResponse = await ctx.database.elastic.search({
      index: 'gnomad_exomes_2_1_1,gnomad_genomes_2_1_1',
      type: 'variant',
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
      url: `/variant/${variant.variant_id}`,
    }))

    return geneResults.concat(variantResults)
  }

  return geneResults
}
