import { UserVisibleError } from '../../errors'
import { getFlagsForContext } from '../shared/flags'
import POPULATIONS from './populations'

const parseHistogram = histogramStr => histogramStr.split('|').map(s => Number(s))

const ageDistributionBinEdges = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80]

const qualityMetricHistogramBinEdges = Array.from(new Array(21), (_, i) => i * 5)

const fetchExacVariantDocument = async (ctx, variantId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'exac_variants',
      type: 'documents',
      id: variantId,
    })

    return response._source
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('Variant not found')
    }
    throw err
  }
}

const fetchExacVariantDetails = async (ctx, variantId) => {
  const variant = await fetchExacVariantDocument(ctx, variantId)

  const { filters } = variant
  if (variant.AC_Adj === 0 && !filters.includes('AC_Adj0_Filter')) {
    filters.push('AC_Adj0_Filter')
  }

  const hetAgeBins = parseHistogram(variant.AGE_HISTOGRAM_HET || '0|0|0|0|0|0|0|0|0|0|0|0')
  const homAgeBins = parseHistogram(variant.AGE_HISTOGRAM_HOM || '0|0|0|0|0|0|0|0|0|0|0|0')

  return {
    gqlType: 'GnomadVariantDetails',
    // variant interface fields
    variantId: variant.variant_id,
    reference_genome: 'GRCh37',
    chrom: variant.locus.contig,
    pos: variant.locus.position,
    ref: variant.alleles[0],
    alt: variant.alleles[1],
    // other fields
    colocatedVariants: (variant.original_alt_alleles || []).filter(
      otherVariantId => otherVariantId !== variant.variant_id
    ),
    exome: {
      ac: variant.AC_Adj,
      ac_hemi: variant.AC_Hemi,
      ac_hom: variant.AC_Hom,
      an: variant.AN_Adj,
      filters,
      populations: POPULATIONS.map(popId => ({
        id: popId,
        ac: (variant.populations[popId] || {}).AC || 0,
        an: (variant.populations[popId] || {}).AN || 0,
        ac_hemi: (variant.populations[popId] || {}).hemi || 0,
        ac_hom: (variant.populations[popId] || {}).hom || 0,
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
      qualityMetrics: {
        genotypeDepth: {
          all: {
            bin_edges: qualityMetricHistogramBinEdges,
            bin_freq: parseHistogram(variant.DP_HIST[0]),
          },
          alt: {
            bin_edges: qualityMetricHistogramBinEdges,
            bin_freq: parseHistogram(variant.DP_HIST[1]),
          },
        },
        genotypeQuality: {
          all: {
            bin_edges: qualityMetricHistogramBinEdges,
            bin_freq: parseHistogram(variant.GQ_HIST[0]),
          },
          alt: {
            bin_edges: qualityMetricHistogramBinEdges,
            bin_freq: parseHistogram(variant.GQ_HIST[1]),
          },
        },
        siteQualityMetrics: {
          BaseQRankSum: variant.BaseQRankSum,
          ClippingRankSum: variant.ClippingRankSum,
          DP: variant.DP,
          FS: variant.FS,
          InbreedingCoeff: variant.InbreedingCoeff,
          MQ: variant.MQ,
          MQRankSum: variant.MQRankSum,
          QD: variant.QD,
          ReadPosRankSum: variant.ReadPosRankSum,
          SiteQuality: variant.qual,
          VQSLOD: variant.VQSLOD,
        },
      },
    },
    flags: getFlagsForContext({ type: 'region' })(variant),
    rsid: variant.rsid,
    sortedTranscriptConsequences: (variant.sorted_transcript_consequences || []).map(
      consequence => ({
        ...consequence,
        gene_id: `ENSG${consequence.gene_id.toString().padStart(11, '0')}`,
        // Backwards compatibility with gnomAD v2.1 variants.
        // This should eventually be moved to the UI.
        hgvs: consequence.hgvsp || consequence.hgvsc,
        transcript_id: `ENST${consequence.transcript_id.toString().padStart(11, '0')}`,
      })
    ),
  }
}

export default fetchExacVariantDetails
