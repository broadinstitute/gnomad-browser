import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import browserConfig from '@browser/config'

import { fetchAllSearchResults } from '../../utilities/elasticsearch'

export const VariantType = new GraphQLObjectType({
  name: 'Variant',
  fields: {
    // variant level fields
    cadd: { type: GraphQLFloat },
    canonical_transcript_id: { type: GraphQLString },
    chrom: { type: GraphQLString },
    comment: { type: GraphQLString },
    consequence: { type: GraphQLString },
    flags: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_name: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsc_canonical: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    hgvsp_canonical: { type: GraphQLString },
    in_analysis: { type: GraphQLBoolean },
    mpc: { type: GraphQLFloat },
    polyphen: { type: GraphQLString },
    pos: { type: GraphQLInt },
    source: { type: new GraphQLList(GraphQLString) },
    transcript_id: { type: GraphQLString },
    variant_id: { type: GraphQLString },
    xpos: { type: GraphQLFloat },
    // group level fields
    analysis_group: { type: GraphQLString },
    ac: { type: GraphQLInt },
    ac_case: { type: GraphQLInt },
    ac_ctrl: { type: GraphQLInt },
    ac_denovo: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    af_case: { type: GraphQLFloat },
    af_ctrl: { type: GraphQLFloat },
    an: { type: GraphQLInt },
    an_case: { type: GraphQLInt },
    an_ctrl: { type: GraphQLInt },
    estimate: { type: GraphQLFloat },
    i2: { type: GraphQLFloat },
    pval_meta: { type: GraphQLFloat },
    qp: { type: GraphQLFloat },
    se: { type: GraphQLFloat },
  },
})

export const fetchVariantsByGeneId = async (ctx, geneId, analysisGroup) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: browserConfig.elasticsearch.variants.index,
    type: browserConfig.elasticsearch.variants.type,
    size: 10000,
    body: {
      query: {
        bool: {
          filter: [
            { term: { gene_id: geneId } },
            {
              bool: {
                should: [
                  { range: { [`groups.${analysisGroup}.ac_case`]: { gt: 0 } } },
                  { range: { [`groups.${analysisGroup}.ac_ctrl`]: { gt: 0 } } },
                ],
              },
            },
          ],
        },
      },
    },
  })

  return hits.map(hit => {
    const doc = hit._source // eslint-disable-line no-underscore-dangle

    const totalAC = doc.groups[analysisGroup].ac_case + doc.groups[analysisGroup].ac_ctrl
    const totalAN = doc.groups[analysisGroup].an_case + doc.groups[analysisGroup].an_ctrl
    const totalAF = totalAN === 0 ? 0 : totalAC / totalAN

    return {
      // variant level fields
      ac_denovo: doc.n_denovos,
      cadd: doc.cadd,
      canonical_transcript_id: doc.canonical_transcript_id,
      chrom: doc.chrom,
      comment: doc.comment,
      consequence: doc.csq_analysis || doc.csq_canonical,
      flags: doc.flags,
      gene_id: doc.gene_id,
      gene_name: doc.gene_name,
      hgvsc: doc.hgvsc,
      hgvsc_canonical: doc.hgvsc_canonical ? doc.hgvsc_canonical.split(':')[1] : null,
      hgvsp: doc.hgvsp,
      hgvsp_canonical: doc.hgvsp_canonical ? doc.hgvsp_canonical.split(':')[1] : null,
      in_analysis: doc.in_analysis,
      mpc: doc.mpc,
      polyphen: doc.polyphen,
      pos: doc.pos,
      source: typeof doc.source === 'string' ? [doc.source] : doc.source,
      transcript_id: doc.transcript_id,
      variant_id: doc.variant_id,
      xpos: doc.xpos,
      // group level fields
      ac: totalAC,
      ac_case: doc.groups[analysisGroup].ac_case,
      ac_ctrl: doc.groups[analysisGroup].ac_ctrl,
      af: totalAF,
      af_case: doc.groups[analysisGroup].af_case,
      af_ctrl: doc.groups[analysisGroup].af_ctrl,
      an: totalAN,
      an_case: doc.groups[analysisGroup].an_case,
      an_ctrl: doc.groups[analysisGroup].an_ctrl,
      analysis_group: doc.analysis_group,
      estimate: doc.groups[analysisGroup].est,
      i2: doc.groups[analysisGroup].i2,
      pval_meta: doc.groups[analysisGroup].p,
      qp: doc.groups[analysisGroup].qp,
      se: doc.groups[analysisGroup].se,
    }
  })
}
