import { GraphQLBoolean, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

export const TranscriptConsequenceType = new GraphQLObjectType({
  name: 'TranscriptConsequence',
  fields: {
    canonical: { type: GraphQLBoolean },
    consequence_terms: { type: new GraphQLList(GraphQLString) },
    gene_id: { type: GraphQLString },
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
