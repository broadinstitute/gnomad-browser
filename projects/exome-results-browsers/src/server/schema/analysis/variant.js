import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

export const VariantType = new GraphQLObjectType({
  name: 'Variant',
  fields: {
    ac: { type: GraphQLInt },
    ac_case: { type: GraphQLInt },
    ac_ctrl: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    af_case: { type: GraphQLFloat },
    af_ctrl: { type: GraphQLFloat },
    an: { type: GraphQLInt },
    an_case: { type: GraphQLInt },
    an_ctrl: { type: GraphQLInt },
    cadd: { type: GraphQLFloat },
    canonical_transcript_id: { type: GraphQLString },
    chrom: { type: GraphQLString },
    comment: { type: GraphQLString },
    consequence: { type: GraphQLString },
    csq_analysis: { type: GraphQLString },
    csq_canonical: { type: GraphQLString },
    csq_worst: { type: GraphQLString },
    estimate: { type: GraphQLFloat },
    flags: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsc_canonical: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    hgvsp_canonical: { type: GraphQLString },
    i2: { type: GraphQLInt },
    in_analysis: { type: GraphQLBoolean },
    mpc: { type: GraphQLFloat },
    n_analysis_groups: { type: GraphQLInt },
    ac_denovo: { type: GraphQLInt },
    polyphen: { type: GraphQLString },
    pos: { type: GraphQLInt },
    pval_meta: { type: GraphQLFloat },
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
  return response.hits.hits.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle

    return {
      ...doc,
      ac_denovo: doc.n_denovos,
      chrom: doc.contig,
      consequence: doc.csq_analysis,
      hgvsc_canonical: doc.hgvsc_canonical ? doc.hgvsc_canonical.split(':')[1] : null,
      hgvsp_canonical: doc.hgvsp_canonical ? doc.hgvsp_canonical.split(':')[1] : null,
      estimate: doc.est,
      pval_meta: doc.pmeta,
    }
  })
}
