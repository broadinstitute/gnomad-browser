import { getXpos } from '../../../utilities/variant'

import { extractPopulationData } from '../shared/population'
import { parseHistogram } from '../shared/qualityMetrics'

const EXAC_POPULATION_IDS = ['AFR', 'AMR', 'EAS', 'FIN', 'NFE', 'OTH', 'SAS']

const fetchExacVariantDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'exac_v1_variants',
    type: 'variant',
    size: 1,
    body: {
      query: {
        bool: {
          filter: {
            term: { variant_id: variantId },
          },
        },
      },
    },
  })

  if (response.hits.hits.length === 0) {
    throw Error('Variant not found')
  }

  // eslint-disable-next-line no-underscore-dangle
  const variantData = response.hits.hits[0]._source

  return {
    gqlType: 'ExacVariantDetails',
    // variant interface fields
    alt: variantData.alt,
    chrom: variantData.contig,
    pos: variantData.start,
    ref: variantData.ref,
    variantId: variantData.variant_id,
    xpos: variantData.xpos,
    // ExAC specific fields
    ac: {
      raw: variantData.AC,
      adj: variantData.AC_Adj,
      hemi: variantData.AC_Hemi,
      hom: variantData.AC_Hom,
    },
    an: {
      raw: variantData.AN,
      adj: variantData.AN_Adj,
    },
    filters: variantData.filters,
    flags: ['lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
    populations: EXAC_POPULATION_IDS.map(popId => ({
      id: popId,
      ac: (variantData.populations[popId] || {}).AC,
      an: (variantData.populations[popId] || {}).AN,
      hemi: (variantData.populations[popId] || {}).hemi,
      hom: (variantData.populations[popId] || {}).hom,
    })),
    qualityMetrics: {
      genotypeDepth: {
        all: parseHistogram(variantData.DP_HIST[0]),
        alt: parseHistogram(variantData.DP_HIST[1]),
      },
      genotypeQuality: {
        all: parseHistogram(variantData.GQ_HIST[0]),
        alt: parseHistogram(variantData.GQ_HIST[1]),
      },
      siteQualityMetrics: {
        AB_MEDIAN: null,
        AS_RF: null,
        BaseQRankSum: variantData.BaseQRankSum,
        ClippingRankSum: variantData.ClippingRankSum,
        DP: variantData.DP,
        DP_MEDIAN: null,
        DREF_MEDIAN: null,
        FS: variantData.FS,
        GQ_MEDIAN: null,
        InbreedingCoeff: variantData.InbreedingCoeff,
        MQ: variantData.MQ,
        MQRankSum: variantData.MQRankSum,
        QD: variantData.QD,
        ReadPosRankSum: variantData.ReadPosRankSum,
        SiteQuality: variantData.qual,
        VQSLOD: variantData.VQSLOD,
      },
    },
    rsid: variantData.rsid,
    sortedTranscriptConsequences: variantData.sortedTranscriptConsequences,
  }
}

export default fetchExacVariantDetails
