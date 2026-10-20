import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'
import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'
import { catchNotFound } from '../elasticsearch'

const SHORT_TANDEM_REPEAT_INDICES = {
  gnomad_r3: 'gnomad_v3_short_tandem_repeats',
  gnomad_r4: 'gnomad_v3_short_tandem_repeats',
}

const SUMMARY_FIELDS = [
  'id',
  'value.id',
  'value.gene',
  'value.associated_diseases',
  'value.stripy_id',
  'value.strchive_id',
  'value.main_reference_region',
  'value.reference_region',
  'value.reference_regions',
  'value.reference_repeat_unit',
  'value.repeat_units',
]

// Only the parts of each locus's genotype counts that the manual review summary needs. Reading these
// instead of the whole genotype distribution cuts the response for all loci from about 9 MB to about 2 MB.
const SUMMARY_FIELDS_WITH_GENOTYPE_QUALITY_COUNTS = [
  ...SUMMARY_FIELDS,
  'value.genotype_distribution.quality_description',
  'value.genotype_distribution.distribution.frequency',
]

// Manual review qualities from low to high, scored 1 (low) to 5 (high)
const MANUAL_REVIEW_GENOTYPE_QUALITIES_FROM_LOW_TO_HIGH = [
  'low',
  'medium-low',
  'medium',
  'medium-high',
  'high',
]

type GenotypeQualityCounts = {
  quality_description: string
  distribution: { frequency: number }[]
}

// Counts a locus's manually reviewed genotypes in each quality and averages their quality, from
// 1 (low) to 5 (high). Each genotype is counted once, since the genotype distribution splits
// genotypes by ancestry group, sex, repeat units, quality, and Q score without any combined groups.
export const summarizeManualReviewGenotypeQuality = (
  genotypeDistribution: GenotypeQualityCounts[]
) => {
  const genotypeCountsByQuality: Record<string, number> = Object.fromEntries(
    MANUAL_REVIEW_GENOTYPE_QUALITIES_FROM_LOW_TO_HIGH.map((quality) => [quality, 0])
  )
  genotypeDistribution.forEach((cohort) => {
    // Indexes built before the pipeline lowercased this field contain values like "medium-Low".
    const quality = cohort.quality_description.toLowerCase()
    if (quality === 'not-reviewed') {
      return
    }
    if (!MANUAL_REVIEW_GENOTYPE_QUALITIES_FROM_LOW_TO_HIGH.includes(quality)) {
      throw new Error(`Unexpected genotype quality "${cohort.quality_description}"`)
    }
    genotypeCountsByQuality[quality] += cohort.distribution.reduce(
      (sum, item) => sum + item.frequency,
      0
    )
  })

  let totalQualityScore = 0
  let numberOfReviewedGenotypes = 0
  MANUAL_REVIEW_GENOTYPE_QUALITIES_FROM_LOW_TO_HIGH.forEach((quality, index) => {
    totalQualityScore += (index + 1) * genotypeCountsByQuality[quality]
    numberOfReviewedGenotypes += genotypeCountsByQuality[quality]
  })
  return {
    average_quality_of_manually_reviewed_genotypes:
      numberOfReviewedGenotypes > 0 ? totalQualityScore / numberOfReviewedGenotypes : null,
    manually_reviewed_genotype_counts_by_quality:
      MANUAL_REVIEW_GENOTYPE_QUALITIES_FROM_LOW_TO_HIGH.map((quality) => ({
        quality_description: quality,
        genotype_count: genotypeCountsByQuality[quality],
      })),
  }
}

// Replaces the partial genotype distribution fetched with SUMMARY_FIELDS_WITH_GENOTYPE_QUALITY_COUNTS
// by its manual review summary.
export const withManualReviewGenotypeQualitySummary = ({
  genotype_distribution: genotypeDistribution,
  ...shortTandemRepeat
}: any) => ({
  ...shortTandemRepeat,
  ...summarizeManualReviewGenotypeQuality(genotypeDistribution || []),
})

type ExactComponent = { chrom: string; start0: number; end0: number; motif: string }

export const classifyExactShortTandemRepeatCatalogContext = (
  tandemRepeats: any[],
  components: ExactComponent[]
) => {
  const candidates: { repeat: any; component_index: number; reference_region_index: number }[] = []
  tandemRepeats.forEach((repeat) => {
    // reference_regions is the provenance-bearing list when present. Older records
    // expose only main_reference_region/reference_region, which is treated as index 0.
    const regions =
      Array.isArray(repeat.reference_regions) && repeat.reference_regions.length
        ? repeat.reference_regions
        : [repeat.main_reference_region || repeat.reference_region].filter(Boolean)
    components.forEach((component, componentIndex) => {
      regions.forEach((region: any, referenceRegionIndex: number) => {
        if (
          region.reference_genome === 'GRCh38' &&
          String(region.chrom).replace(/^chr/i, '').toUpperCase() ===
            String(component.chrom).replace(/^chr/i, '').toUpperCase() &&
          Number(region.start) === component.start0 &&
          Number(region.stop) === component.end0 &&
          repeat.reference_repeat_unit === component.motif &&
          component.motif === component.motif.toUpperCase()
        ) {
          candidates.push({
            repeat,
            component_index: componentIndex,
            reference_region_index: referenceRegionIndex,
          })
        }
      })
    })
  })
  candidates.sort(
    (left, right) =>
      left.component_index - right.component_index ||
      String(left.repeat.id).localeCompare(String(right.repeat.id)) ||
      left.reference_region_index - right.reference_region_index
  )
  if (!candidates.length) return { status: 'NONE', reason_code: 'NO_EXACT_COMPONENT', candidates }

  const recordsByComponent = new Map<number, Set<string>>()
  const componentsByRecord = new Map<string, Set<number>>()
  for (const candidate of candidates) {
    const records = recordsByComponent.get(candidate.component_index) || new Set<string>()
    records.add(candidate.repeat.id)
    recordsByComponent.set(candidate.component_index, records)
    const indices = componentsByRecord.get(candidate.repeat.id) || new Set<number>()
    indices.add(candidate.component_index)
    componentsByRecord.set(candidate.repeat.id, indices)
  }
  if ([...recordsByComponent.values()].some((records) => records.size > 1)) {
    return { status: 'AMBIGUOUS_CATALOG', reason_code: 'DUPLICATE_CATALOG_EXACT_KEY', candidates }
  }
  if (
    candidates.length !== 1 ||
    [...componentsByRecord.values()].some((indices) => indices.size > 1)
  ) {
    return {
      status: 'AMBIGUOUS_COMPONENT',
      reason_code: 'NON_BIJECTIVE_ORDERED_COMPONENT',
      candidates,
    }
  }
  return { status: 'EXACT_UNIQUE', reason_code: null, candidates }
}

export const exactShortTandemRepeatCatalogMatches = (
  tandemRepeats: any[],
  components: ExactComponent[]
) => {
  const context = classifyExactShortTandemRepeatCatalogContext(tandemRepeats, components)
  if (context.status !== 'EXACT_UNIQUE') return []
  const repeat = context.candidates[0].repeat
  return [
    {
      id: repeat.id,
      gene_symbol: repeat.gene?.symbol || null,
      reference_repeat_unit: repeat.reference_repeat_unit,
      stripy_id: repeat.stripy_id || null,
      strchive_id: repeat.strchive_id || null,
    },
  ]
}

const requireShortTandemRepeatIndex = (datasetId: any) => {
  // @ts-expect-error TS(7053) dataset IDs are validated by GraphQL at the public boundary.
  const index = SHORT_TANDEM_REPEAT_INDICES[datasetId]
  if (!index) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) dataset IDs are validated by GraphQL at the public boundary.
      `Tandem repeat data is not available for ${DATASET_LABELS[datasetId]}`
    )
  }
  return index
}

export const SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING = 500

export const fetchBoundedShortTandemRepeatCatalog = async (esClient: any, datasetId: any) => {
  const response = await esClient.search({
    index: requireShortTandemRepeatIndex(datasetId),
    type: '_doc',
    size: SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING + 1,
    _source: SUMMARY_FIELDS,
    body: {
      query: { match_all: {} },
      sort: [{ id: { order: 'asc' } }],
    },
  })
  const hits = response.body.hits.hits
  if (hits.length > SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING) {
    throw new Error('SHORT_TANDEM_REPEAT_CATALOG_HARD_CEILING_EXCEEDED')
  }
  return hits.map((hit: any) => hit._source.value)
}

export const fetchAllShortTandemRepeats = async (esClient: any, datasetId: any) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Tandem repeat data is not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const hits = await fetchAllSearchResults(esClient, {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 10000,
    _source: SUMMARY_FIELDS_WITH_GENOTYPE_QUALITY_COUNTS,
    body: {
      query: {
        match_all: {},
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return hits.map((hit: any) => withManualReviewGenotypeQualitySummary(hit._source.value))
}

export const fetchShortTandemRepeatDetailReceipt = async (
  esClient: any,
  datasetId: any,
  shortTandemRepeatId: any
) => {
  const index = requireShortTandemRepeatIndex(datasetId)
  try {
    const response = await esClient.get({
      index,
      type: '_doc',
      id: shortTandemRepeatId,
    })
    return {
      record: response.body._source.value,
      concrete_index: response.body._index || null,
    }
  } catch (err) {
    return catchNotFound(err)
  }
}

export const fetchShortTandemRepeatById = async (
  esClient: any,
  datasetId: any,
  shortTandemRepeatId: any
) => {
  const detail = await fetchShortTandemRepeatDetailReceipt(esClient, datasetId, shortTandemRepeatId)
  return detail?.record
}

export const fetchShortTandemRepeatsByGene = async (
  esClient: any,
  datasetId: any,
  ensemblGeneId: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Tandem repeat data is not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 100,
    _source: SUMMARY_FIELDS_WITH_GENOTYPE_QUALITY_COUNTS,
    body: {
      query: {
        bool: {
          filter: {
            term: {
              ensembl_id: ensemblGeneId,
            },
          },
        },
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return response.body.hits.hits.map((hit: any) =>
    withManualReviewGenotypeQualitySummary(hit._source.value)
  )
}

export const fetchShortTandemRepeatsByRegion = async (
  esClient: any,
  datasetId: any,
  region: any
) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `Tandem repeat data is not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 100,
    _source: SUMMARY_FIELDS_WITH_GENOTYPE_QUALITY_COUNTS,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'reference_region.chrom': region.chrom,
              },
            },
            {
              range: {
                'reference_region.start': {
                  lte: region.stop,
                },
              },
            },
            {
              range: {
                'reference_region.stop': {
                  gte: region.start,
                },
              },
            },
          ],
        },
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return response.body.hits.hits.map((hit: any) =>
    withManualReviewGenotypeQualitySummary(hit._source.value)
  )
}
