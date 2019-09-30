import { GraphQLBoolean, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

export const TranscriptConsequenceType = new GraphQLObjectType({
  name: 'TranscriptConsequence',
  fields: {
    amino_acids: { type: GraphQLString },
    biotype: { type: GraphQLString },
    canonical: { type: GraphQLBoolean },
    category: { type: GraphQLString },
    cdna_start: { type: GraphQLInt },
    cdna_end: { type: GraphQLInt },
    codons: { type: GraphQLString },
    consequence_terms: { type: new GraphQLList(GraphQLString) },
    domains: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_symbol: { type: GraphQLString },
    gene_symbol_source: { type: GraphQLString },
    hgvs: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    lof: { type: GraphQLString },
    lof_flags: { type: GraphQLString },
    lof_filter: { type: GraphQLString },
    lof_info: { type: GraphQLString },
    major_consequence: { type: GraphQLString },
    major_consequence_rank: { type: GraphQLInt },
    polyphen_prediction: { type: GraphQLString },
    protein_id: { type: GraphQLString },
    sift_prediction: { type: GraphQLString },
    transcript_id: { type: GraphQLString },
  },
})

export const getConsequenceForContext = context => {
  switch (context.type) {
    case 'gene':
      return variant =>
        (variant.sortedTranscriptConsequences || []).find(csq => csq.gene_id === context.geneId)
    case 'region':
      return variant => (variant.sortedTranscriptConsequences || [])[0]
    case 'transcript':
      return variant =>
        (variant.sortedTranscriptConsequences || []).find(
          csq => csq.transcript_id === context.transcriptId
        )
    default:
      throw Error(`Invalid context for getConsequenceForContext: ${context.type}`)
  }
}
