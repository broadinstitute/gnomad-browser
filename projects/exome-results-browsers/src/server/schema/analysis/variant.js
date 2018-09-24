import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

export const VariantType = new GraphQLObjectType({
  name: 'Variant',
  fields: {
    ac: { type: GraphQLInt },
    ac_case: { type: GraphQLInt },
    ac_ctrl: { type: GraphQLInt },
    af_case: { type: GraphQLFloat },
    af_ctrl: { type: GraphQLFloat },
    allele_freq: {
      type: GraphQLFloat,
      resolve: obj => obj.af,
    },
    an: { type: GraphQLInt },
    an_case: { type: GraphQLInt },
    an_ctrl: { type: GraphQLInt },
    cadd: { type: GraphQLFloat },
    canonical_transcript_id: { type: GraphQLString },
    chrom: {
      type: GraphQLString,
      resolve: obj => obj.contig,
    },
    comment: { type: GraphQLString },
    consequence: {
      type: GraphQLString,
      resolve: obj => obj.csq_analysis,
    },
    csq_analysis: { type: GraphQLString },
    csq_canonical: { type: GraphQLString },
    csq_worst: { type: GraphQLString },
    estimate: {
      type: GraphQLFloat,
      resolve: obj => obj.est,
    },
    flags: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsc_canonical: {
      type: GraphQLString,
      resolve: obj => (obj.hgvsc_canonical ? obj.hgvsc_canonical.split(':')[1] : null),
    },
    hgvsp: { type: GraphQLString },
    hgvsp_canonical: {
      type: GraphQLString,
      resolve: obj => (obj.hgvsp_canonical ? obj.hgvsp_canonical.split(':')[1] : null),
    },
    i2: { type: GraphQLInt },
    in_analysis: { type: GraphQLBoolean },
    mpc: { type: GraphQLFloat },
    n_analysis_groups: { type: GraphQLInt },
    ac_denovo: {
      type: GraphQLInt,
      resolve: obj => obj.n_denovos,
    },
    polyphen: { type: GraphQLString },
    pos: { type: GraphQLInt },
    pval_meta: {
      type: GraphQLFloat,
      resolve: obj => obj.pmeta,
    },
    qp: { type: GraphQLInt },
    se: { type: GraphQLInt },
    source: { type: GraphQLString },
    transcript_id: { type: GraphQLString },
    variant_id: { type: GraphQLString },
    xpos: { type: GraphQLFloat },
  },
})

export const fetchVariantsByGeneId = async (ctx, geneId) => {
  const response = await ctx.database.elastic.search({
    index: BROWSER_CONFIG.elasticsearch.variants.index,
    type: BROWSER_CONFIG.elasticsearch.variants.type,
    size: 10000,
    body: {
      query: {
        match: {
          gene_id: geneId,
        },
      },
    },
  })
  return response.hits.hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}
