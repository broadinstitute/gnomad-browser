import { UserVisibleError } from '../../errors'
import POPULATIONS from './populations'

const parseHistogram = histogramStr => histogramStr.split('|').map(s => Number(s))

const ageDistributionBinEdges = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80]

const qualityMetricHistogramBinEdges = Array.from(new Array(21), (_, i) => i * 5)

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
    throw new UserVisibleError('Variant not found')
  }

  // eslint-disable-next-line no-underscore-dangle
  const variantData = response.hits.hits[0]._source

  const { filters } = variantData
  if (variantData.AC_Adj === 0 && !filters.includes('AC_Adj0_Filter')) {
    filters.push('AC_Adj0_Filter')
  }

  const hetAgeBins = parseHistogram(variantData.AGE_HISTOGRAM_HET)
  const homAgeBins = parseHistogram(variantData.AGE_HISTOGRAM_HOM)

  return {
    gqlType: 'ExacVariantDetails',
    // variant interface fields
    alt: variantData.alt,
    chrom: variantData.chrom,
    pos: variantData.pos,
    ref: variantData.ref,
    variantId: variantData.variant_id,
    xpos: variantData.xpos,
    // ExAC specific fields
    ac: variantData.AC_Adj,
    ac_hemi: variantData.AC_Hemi,
    ac_hom: variantData.AC_Hom,
    an: variantData.AN_Adj,
    filters,
    flags: ['lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
    other_alt_alleles: variantData.original_alt_alleles.filter(
      otherVariantId => otherVariantId !== variantData.variant_id
    ),
    populations: POPULATIONS.map(popId => ({
      id: popId,
      ac: (variantData.populations[popId] || {}).AC || 0,
      an: (variantData.populations[popId] || {}).AN || 0,
      ac_hemi: (variantData.populations[popId] || {}).hemi || 0,
      ac_hom: (variantData.populations[popId] || {}).hom || 0,
    })),
    age_distribution: {
      het: {
        bin_edges: ageDistributionBinEdges,
        bin_freq: hetAgeBins.slice(1, 11),
        n_smaller: hetAgeBins[0],
        n_larger: hetAgeBins[11],
      },
      hom: {
        bin_edges: ageDistributionBinEdges,
        bin_freq: homAgeBins.slice(1, 11),
        n_smaller: homAgeBins[0],
        n_larger: homAgeBins[11],
      },
    },
    // FIXME: For both genotype depth and quality, all and alt return the same histogram.
    // See #448
    qualityMetrics: {
      genotypeDepth: {
        all: {
          bin_edges: qualityMetricHistogramBinEdges,
          bin_freq: parseHistogram(variantData.DP_HIST),
        },
        alt: {
          bin_edges: qualityMetricHistogramBinEdges,
          bin_freq: parseHistogram(variantData.DP_HIST),
        },
      },
      genotypeQuality: {
        all: {
          bin_edges: qualityMetricHistogramBinEdges,
          bin_freq: parseHistogram(variantData.GQ_HIST),
        },
        alt: {
          bin_edges: qualityMetricHistogramBinEdges,
          bin_freq: parseHistogram(variantData.GQ_HIST),
        },
      },
      siteQualityMetrics: {
        BaseQRankSum: variantData.BaseQRankSum,
        ClippingRankSum: variantData.ClippingRankSum,
        DP: variantData.DP,
        FS: variantData.FS,
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
    sortedTranscriptConsequences: variantData.sortedTranscriptConsequences || [],
  }
}

export default fetchExacVariantDetails
