import { GraphQLBoolean, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { fetchGenesByIds } from '../../gene-models/gene'

export const TranscriptConsequenceType = new GraphQLObjectType({
  name: 'TranscriptConsequence',
  fields: {
    canonical: { type: GraphQLBoolean },
    consequence_terms: { type: new GraphQLList(GraphQLString) },
    gene_id: { type: GraphQLString },
    gene_version: { type: GraphQLString },
    gene_symbol: { type: GraphQLString },
    hgvs: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    lof: { type: GraphQLString },
    lof_flags: { type: GraphQLString },
    lof_filter: { type: GraphQLString },
    major_consequence: { type: GraphQLString },
    polyphen_prediction: { type: GraphQLString },
    sift_prediction: { type: GraphQLString },
    transcript_id: { type: GraphQLString },
    transcript_version: { type: GraphQLString },
  },
})

export const getConsequenceForContext = context => {
  switch (context.type) {
    case 'gene':
      return variant =>
        (variant.sorted_transcript_consequences || variant.sortedTranscriptConsequences || []).find(
          csq => csq.gene_id === context.geneId
        )
    case 'region':
      return variant =>
        (variant.sorted_transcript_consequences || variant.sortedTranscriptConsequences || [])[0]
    case 'transcript':
      return variant =>
        (variant.sorted_transcript_consequences || variant.sortedTranscriptConsequences || []).find(
          csq => csq.transcript_id === context.transcriptId
        )
    default:
      throw Error(`Invalid context for getConsequenceForContext: ${context.type}`)
  }
}

export const fetchTranscriptsForConsequences = async (
  ctx,
  transcriptConsequences,
  referenceGenome
) => {
  if (transcriptConsequences.length === 0) {
    return []
  }

  const geneIds = Array.from(new Set(transcriptConsequences.map(csq => csq.gene_id)))
  const genes = await fetchGenesByIds(ctx, geneIds, referenceGenome)

  const transcripts = {}
  genes.forEach(gene => {
    gene.transcripts.forEach(transcript => {
      transcripts[transcript.transcript_id] = {
        ...transcript,
        gene,
      }
    })
  })

  return transcripts
}
