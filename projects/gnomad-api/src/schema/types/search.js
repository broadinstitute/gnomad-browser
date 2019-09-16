import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { flatMap } from 'lodash'

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
      index: 'genes_grch37',
      type: 'documents',
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
        label: `${gene.gene_id} (${gene.gene_name})`,
        url: `/gene/${gene.gene_id}`,
      }
    })
  }

  if (/^ENST[0-9]/.test(upperCaseQuery)) {
    const transcriptIdSearchResponse = await ctx.database.elastic.search({
      index: 'genes_grch37',
      type: 'documents',
      body: {
        query: {
          nested: {
            path: 'transcripts',
            query: {
              prefix: { 'transcripts.transcript_id': upperCaseQuery },
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
      gene.transcripts.filter(transcript => transcript.transcript_id.startsWith(upperCaseQuery))
    )

    return transcripts.map(transcript => ({
      label: `${transcript.transcript_id}`,
      url: `/transcript/${transcript.transcript_id}`,
    }))
  }

  const geneNameSearchResponse = await ctx.database.elastic.search({
    index: 'genes_grch37',
    type: 'documents',
    body: {
      query: {
        bool: {
          should: [
            {
              term: {
                gene_name_upper: upperCaseQuery,
              },
            },
            {
              prefix: {
                gene_name_upper: upperCaseQuery,
              },
            },
            {
              prefix: {
                other_names: upperCaseQuery,
              },
            },
          ],
        },
      },
    },
    size: 5,
  })

  const matchingGenes =
    geneNameSearchResponse.hits.total > 0
      ? geneNameSearchResponse.hits.hits.map(hit => hit._source)
      : []

  const geneNameCounts = {}
  matchingGenes.forEach(gene => {
    if (geneNameCounts[gene.gene_name_upper] === undefined) {
      geneNameCounts[gene.gene_name_upper] = 0
    }
    geneNameCounts[gene.gene_name_upper] += 1
  })

  const geneResults = matchingGenes.map(gene => ({
    label:
      geneNameCounts[gene.gene_name_upper] > 1
        ? `${gene.gene_name_upper} (${gene.gene_id})`
        : gene.gene_name_upper,
    url: `/gene/${gene.gene_id}`,
  }))

  if (geneResults.length < 5 && /^rs[0-9]/i.test(query)) {
    const response = await ctx.database.elastic.search({
      index: 'gnomad_exomes_2_1_1,gnomad_genomes_2_1_1',
      type: 'variant',
      _source: ['rsid', 'variant_id'],
      body: {
        query: {
          term: { rsid: query.toLowerCase() },
        },
      },
      size: 5 - geneResults.length,
    })

    const variantResults = response.hits.hits.map(doc => ({
      label: `${doc._source.variant_id} (${doc._source.rsid})`,
      url: `/variant/${doc._source.variant_id}`,
    }))

    return geneResults.concat(variantResults)
  }

  return geneResults
}
