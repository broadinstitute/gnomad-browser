import { getXpos } from '../../../utilities/variant'

import { extractPopulationData } from '../shared/population'
import { parseHistogram } from '../shared/qualityMetrics'

const EXAC_POPULATION_IDS = ['AFR', 'AMR', 'EAS', 'FIN', 'NFE', 'OTH', 'SAS']

const fetchExacVariantDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'exacv1',
    type: 'variant',
    size: 1,
    body: {
      query: {
        bool: {
          filter: {
            term: { variantId },
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
    variantId: variantData.variantId,
    xpos: getXpos(variantData.contig, variantData.start),
    // ExAC specific fields
    ac: {
      raw: variantData.AC,
      adj: variantData.AC_Adj,
    },
    an: {
      raw: variantData.AN,
      adj: variantData.AN_Adj,
    },
    filters: variantData.filters,
    populations: extractPopulationData(EXAC_POPULATION_IDS, variantData),
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
    sortedTranscriptConsequences: JSON.parse(variantData.sortedTranscriptConsequences),
  }
}

export default fetchExacVariantDetails
