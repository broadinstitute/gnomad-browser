import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'


const clinvarType = new GraphQLObjectType({
  name: 'ClinvarType',
  fields: {
    allele_id: { type: GraphQLInt },
    chrom: { type: GraphQLString },
    clinical_significance: { type: GraphQLString },
    domains: { type: GraphQLString },
    gene_ids: { type: GraphQLString },
    main_transcript_amino_acids: { type: GraphQLString },
    main_transcript_biotype: { type: GraphQLString },
    main_transcript_canonical: { type: GraphQLInt },
    main_transcript_category: { type: GraphQLString },
    main_transcript_cdna_end: { type: GraphQLInt },
    main_transcript_cdna_start: { type: GraphQLInt },
    main_transcript_codons: { type: GraphQLString },
    main_transcript_distance: { type: GraphQLInt },
    main_transcript_domains: { type: GraphQLString },
    main_transcript_exon: { type: GraphQLString },
    main_transcript_gene_id: { type: GraphQLString },
    main_transcript_gene_symbol: { type: GraphQLString },
    main_transcript_gene_symbol_source: { type: GraphQLString },
    main_transcript_hgnc_id: { type: GraphQLString },
    main_transcript_hgvs: { type: GraphQLString },
    main_transcript_hgvsc: { type: GraphQLString },
    main_transcript_hgvsp: { type: GraphQLString },
    main_transcript_lof: { type: GraphQLString },
    main_transcript_lof_filter: { type: GraphQLString },
    main_transcript_lof_flags: { type: GraphQLString },
    main_transcript_lof_info: { type: GraphQLString },
    main_transcript_major_consequence: { type: GraphQLString },
    main_transcript_major_consequence_rank: { type: GraphQLInt },
    main_transcript_protein_id: { type: GraphQLString },
    main_transcript_transcript_id: { type: GraphQLString },
    pos: { type: GraphQLFloat },
    ref: { type: GraphQLString },
    review_status: { type: GraphQLString },
    transcript_consequence_terms: { type: GraphQLString },
    transcript_ids: { type: GraphQLString },
    variant_id: { type: GraphQLString },
    xpos: { type: GraphQLFloat },
  },
})

export default clinvarType


export function lookupClinvarVariantsByGeneId(client, geneId) {
  return fetchAllSearchResults(
    client,
    {
      index: 'clinvar_grch37',
      type: 'variant',
      body: {
        query: {
          bool: {
            filter: [
              { term: { gene_ids: geneId } },
              { exists: { field: 'main_transcript_hgvsp' } },
            ],
          },
        },
        sort: [
          { xpos: { order: 'asc' } },
        ],
      },
    }
  )
}
