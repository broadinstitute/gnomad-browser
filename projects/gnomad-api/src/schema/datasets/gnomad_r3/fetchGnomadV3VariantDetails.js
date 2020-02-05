import { flatMap } from 'lodash'

import { UserVisibleError } from '../../errors'
import { getFlagsForContext } from '../shared/flags'
import POPULATIONS from './gnomadV3Populations'

const formatHistogram = histogramData => ({
  bin_edges: histogramData.bin_edges.split('|').map(s => Number(s)),
  bin_freq: histogramData.bin_freq.split('|').map(s => Number(s)),
  n_larger: histogramData.n_larger,
  n_smaller: histogramData.n_smaller,
})

const formatPopulations = variantData => [
  ...flatMap(POPULATIONS, popId => [
    {
      id: popId.toUpperCase(),
      ac: ((variantData.freq.adj.populations[popId] || {}).total || {}).AC || 0,
      an: ((variantData.freq.adj.populations[popId] || {}).total || {}).AN || 0,
      ac_hemi: variantData.nonpar
        ? ((variantData.freq.adj.populations[popId] || {}).male || {}).AC || 0
        : 0,
      ac_hom: ((variantData.freq.adj.populations[popId] || {}).total || {}).homozygote_count || 0,
    },
    {
      id: `${popId.toUpperCase()}_FEMALE`,
      ac: ((variantData.freq.adj.populations[popId] || {}).female || {}).AC || 0,
      an: ((variantData.freq.adj.populations[popId] || {}).female || {}).AN || 0,
      ac_hemi: 0,
      ac_hom: ((variantData.freq.adj.populations[popId] || {}).female || {}).homozygote_count || 0,
    },
    {
      id: `${popId.toUpperCase()}_MALE`,
      ac: ((variantData.freq.adj.populations[popId] || {}).male || {}).AC || 0,
      an: ((variantData.freq.adj.populations[popId] || {}).male || {}).AN || 0,
      ac_hemi: variantData.nonpar
        ? ((variantData.freq.adj.populations[popId] || {}).male || {}).AC || 0
        : 0,
      ac_hom: ((variantData.freq.adj.populations[popId] || {}).male || {}).homozygote_count || 0,
    },
  ]),
  {
    id: 'FEMALE',
    ac: (variantData.freq.adj.female || {}).AC || 0,
    an: (variantData.freq.adj.female || {}).AN || 0,
    ac_hemi: 0,
    ac_hom: (variantData.freq.adj.female || {}).homozygote_count || 0,
  },
  {
    id: 'MALE',
    ac: (variantData.freq.adj.male || {}).AC || 0,
    an: (variantData.freq.adj.male || {}).AN || 0,
    ac_hemi: variantData.nonpar ? (variantData.freq.adj.male || {}).AC || 0 : 0,
    ac_hom: (variantData.freq.adj.male || {}).homozygote_count || 0,
  },
]

const formatFilteringAlleleFrequency = (variantData, fafField) => {
  const { total, ...populationFAFs } = variantData.faf.adj

  let popmaxFAF = -Infinity
  let popmaxPopulation = null

  Object.keys(populationFAFs).forEach(popId => {
    if (populationFAFs[popId][fafField] > popmaxFAF) {
      popmaxFAF = populationFAFs[popId][fafField]
      popmaxPopulation = popId.toUpperCase()
    }
  })

  if (popmaxFAF === -Infinity) {
    popmaxFAF = null
  }

  return {
    popmax: popmaxFAF,
    popmax_population: popmaxPopulation,
  }
}

const fetchGnomadV3VariantDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_r3_variants',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id: variantId } },
        },
      },
    },
    size: 1,
  })

  if (response.hits.hits.length === 0) {
    throw new UserVisibleError('Variant not found')
  }

  const variant = response.hits.hits[0]._source

  return {
    // variant ID fields
    variantId: variant.variant_id,
    reference_genome: 'GRCh38',
    chrom: variant.locus.contig.slice(3),
    pos: variant.locus.position,
    ref: variant.alleles[0],
    alt: variant.alleles[1],
    // gnomAD specific fields
    colocatedVariants: [],
    multiNucleotideVariants: [],
    exome: null,
    flags: getFlagsForContext({ type: 'region' })(variant),
    genome: {
      ac: variant.freq.adj.total.AC || 0,
      an: variant.freq.adj.total.AN || 0,
      ac_hemi: variant.nonpar ? (variant.freq.adj.male || {}).AC || 0 : 0,
      ac_hom: variant.freq.adj.total.homozygote_count || 0,
      faf95: formatFilteringAlleleFrequency(variant, 'faf95'),
      faf99: formatFilteringAlleleFrequency(variant, 'faf99'),
      filters: variant.filters,
      populations: formatPopulations(variant),
      age_distribution: null,
      qualityMetrics: {
        alleleBalance: {
          alt: formatHistogram(variant.ab_hist_alt),
        },
        genotypeDepth: {
          all: formatHistogram(variant.dp_hist_all),
          alt: formatHistogram(variant.dp_hist_alt),
        },
        genotypeQuality: {
          all: formatHistogram(variant.gq_hist_all),
          alt: formatHistogram(variant.gq_hist_alt),
        },
        siteQualityMetrics: {
          // TODO: Update this for v3.
          // Since gnomAD v3 and v2 variants share the same GraphQL type and that type
          // was created for v2, this is the list of quality metrics for gnomAD v2 variants
          BaseQRankSum: null,
          ClippingRankSum: null,
          DP: null,
          FS: variant.info.FS,
          InbreedingCoeff: variant.info.InbreedingCoeff,
          MQ: variant.info.MQ,
          MQRankSum: variant.info.MQRankSum,
          pab_max: null,
          QD: variant.info.QD,
          ReadPosRankSum: variant.info.ReadPosRankSum,
          RF: null,
          SiteQuality: variant.info.QUALapprox,
          SOR: variant.info.SOR,
          VQSLOD: variant.info.VQSLOD,
        },
      },
    },
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

export default fetchGnomadV3VariantDetails
