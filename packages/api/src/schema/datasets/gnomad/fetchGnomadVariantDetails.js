import { extractPopulationData } from '../shared/population'
import { parseHistogram } from '../shared/qualityMetrics'

const GNOMAD_POPULATION_IDS = ['AFR', 'AMR', 'ASJ', 'EAS', 'FIN', 'NFE', 'OTH', 'SAS']

const extractQualityMetrics = variantData => ({
  genotypeDepth: {
    all: parseHistogram(variantData.DP_HIST_ALL),
    alt: parseHistogram(variantData.DP_HIST_ALT),
  },
  genotypeQuality: {
    all: parseHistogram(variantData.GQ_HIST_ALL),
    alt: parseHistogram(variantData.GQ_HIST_ALT),
  },
  siteQualityMetrics: {
    AB_MEDIAN: variantData.AB_MEDIAN,
    AS_RF: variantData.AS_RF,
    BaseQRankSum: variantData.BaseQRankSum,
    ClippingRankSum: variantData.ClippingRankSum,
    DP: variantData.DP,
    DP_MEDIAN: variantData.DP_MEDIAN,
    DREF_MEDIAN: variantData.DREF_MEDIAN,
    FS: variantData.FS,
    GQ_MEDIAN: variantData.GQ_MEDIAN,
    InbreedingCoeff: variantData.InbreedingCoeff,
    MQ: variantData.MQ,
    MQRankSum: variantData.MQRankSum,
    QD: variantData.QD,
    ReadPosRankSum: variantData.ReadPosRankSum,
    SiteQuality: variantData.qual,
    VQSLOD: variantData.VQSLOD,
  },
})

const fetchGnomadVariantData = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: ['gnomad_exomes_202_37', 'gnomad_genomes_202_37'],
    type: 'variant',
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

  /* eslint-disable no-underscore-dangle */
  const exomeDoc = response.hits.hits.find(hit => hit._index === 'gnomad_exomes_202_37')
  const exomeData = exomeDoc ? exomeDoc._source : undefined

  const genomeDoc = response.hits.hits.find(hit => hit._index === 'gnomad_genomes_202_37')
  const genomeData = genomeDoc ? genomeDoc._source : undefined

  return {
    exomeData,
    genomeData,
  }
}

const fetchColocatedVariants = async (ctx, variantId) => {
  const parts = variantId.split('-')
  const contig = parts[0]
  const pos = parts[1]

  const response = await ctx.database.elastic.search({
    index: ['gnomad_exomes_202_37', 'gnomad_genomes_202_37'],
    type: 'variant',
    _source: ['variantId'],
    body: {
      query: {
        bool: {
          filter: [{ term: { contig } }, { term: { pos } }],
        },
      },
    },
  })

  return response.hits.hits
    .map(doc => doc._source.variantId)
    .filter(otherVariantId => otherVariantId !== variantId)
    .sort()
    .filter(
      (otherVariantId, index, allOtherVariantIds) =>
        otherVariantId !== allOtherVariantIds[index + 1]
    )
}

const fetchGnomadVariantDetails = async (ctx, variantId) => {
  const [{ exomeData, genomeData }, colocatedVariants] = await Promise.all([
    fetchGnomadVariantData(ctx, variantId),
    fetchColocatedVariants(ctx, variantId),
  ])

  if (!exomeData && !genomeData) {
    throw Error('Variant not found')
  }

  const sharedData = exomeData || genomeData

  const sharedVariantFields = {
    alt: sharedData.alt,
    chrom: sharedData.contig,
    pos: sharedData.pos,
    ref: sharedData.ref,
    variantId: sharedData.variantId,
    xpos: sharedData.xpos,
  }

  return {
    gqlType: 'GnomadVariantDetails',
    // variant interface fields
    ...sharedVariantFields,
    // gnomAD specific fields
    colocatedVariants,
    exome: exomeData
      ? {
          // Include variant fields so that the reads data resolver can access them.
          ...sharedVariantFields,
          ac: exomeData.AC,
          an: exomeData.AN,
          filters: exomeData.filters,
          populations: extractPopulationData(GNOMAD_POPULATION_IDS, exomeData),
          qualityMetrics: extractQualityMetrics(exomeData),
        }
      : null,
    genome: genomeData
      ? {
          // Include variant fields so that the reads data resolver can access them.
          ...sharedVariantFields,
          ac: genomeData.AC,
          an: genomeData.AN,
          filters: genomeData.filters,
          populations: extractPopulationData(GNOMAD_POPULATION_IDS, genomeData),
          qualityMetrics: extractQualityMetrics(genomeData),
        }
      : null,
    rsid: sharedData.rsid,
    sortedTranscriptConsequences: JSON.parse(sharedData.sortedTranscriptConsequences),
  }
}

export default fetchGnomadVariantDetails
