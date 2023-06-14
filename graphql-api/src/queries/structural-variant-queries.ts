import { isEmpty } from 'lodash'

import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

const GNOMAD_STRUCTURAL_VARIANTS_V2_INDEX = 'gnomad_structural_variants_v2'
const GNOMAD_STRUCTURAL_VARIANTS_V3_INDEX = 'gnomad_structural_variants_v3'

type SvDatasetId =
  | 'gnomad_sv_r2_1'
  | 'gnomad_sv_r2_1_controls'
  | 'gnomad_sv_r2_1_non_neuro'
  | 'gnomad_sv_r3'
type Subset = 'all' | 'controls' | 'non_neuro'
type DatasetDependentQueryParams = {
  index: string
  subset: Subset
  variantIdParams: (variantId: string) => any
}

const v2VariantIdParams = (variantId: string) => ({ variant_id: variantId })
const v3VariantIdParams = (variantId: string) => ({
  variant_id_upper_case: variantId.toUpperCase(),
})

const datasetDependentQueryParams: Record<SvDatasetId, DatasetDependentQueryParams> = {
  gnomad_sv_r2_1: {
    index: GNOMAD_STRUCTURAL_VARIANTS_V2_INDEX,
    subset: 'all',
    variantIdParams: v2VariantIdParams,
  },
  gnomad_sv_r2_1_controls: {
    index: GNOMAD_STRUCTURAL_VARIANTS_V2_INDEX,
    subset: 'controls',
    variantIdParams: v2VariantIdParams,
  },
  gnomad_sv_r2_1_non_neuro: {
    index: GNOMAD_STRUCTURAL_VARIANTS_V2_INDEX,
    subset: 'non_neuro',
    variantIdParams: v2VariantIdParams,
  },
  gnomad_sv_r3: {
    index: GNOMAD_STRUCTURAL_VARIANTS_V3_INDEX,
    subset: 'all',
    variantIdParams: v3VariantIdParams,
  },
} as const

export type GeneQueryParams = { symbol: string }
export type RegionQueryParams = {
  chrom: number
  start: number
  stop: number
  xstart: number
  xstop: number
}

export const fetchStructuralVariantById = async (
  esClient: any,
  datasetId: SvDatasetId,
  variantId: string
) => {
  const { index, subset, variantIdParams } = datasetDependentQueryParams[datasetId]
  const response = await esClient.search({
    index,
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: variantIdParams(variantId) },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total.value === 0) {
    return null
  }

  const variant = response.body.hits.hits[0]._source.value

  // If the variant is not in the subset, then variant.freq[subset] will be an empty object.
  if (!variant.freq[subset].ac) {
    return null
  }

  return {
    ...variant,
    ...variant.freq[subset],
    age_distribution:
      !isEmpty(variant.age_distribution.het) || !isEmpty(variant.age_distribution.hom)
        ? {
            het: isEmpty(variant.age_distribution.het) ? null : variant.age_distribution.het,
            hom: isEmpty(variant.age_distribution.hom) ? null : variant.age_distribution.hom,
          }
        : null,
    genotype_quality:
      !isEmpty(variant.genotype_quality.all) || !isEmpty(variant.genotype_quality.alt)
        ? {
            all: isEmpty(variant.genotype_quality.all) ? null : variant.genotype_quality.all,
            alt: isEmpty(variant.genotype_quality.alt) ? null : variant.genotype_quality.alt,
          }
        : null,
  }
}

const esFieldsToFetch = (subset: any) => [
  'value.chrom',
  'value.chrom2',
  'value.consequences',
  'value.end',
  'value.end2',
  'value.filters',
  `value.freq.${subset}`,
  'value.intergenic',
  'value.length',
  'value.pos',
  'value.pos2',
  'value.reference_genome',
  'value.type',
  'value.variant_id',
]
export const fetchStructuralVariantsByGene = async (
  esClient: any,
  datasetId: SvDatasetId,
  gene: GeneQueryParams
) => {
  const { index, subset } = datasetDependentQueryParams[datasetId]
  const hits = await fetchAllSearchResults(esClient, {
    index,
    type: '_doc',
    size: 10000,
    _source: esFieldsToFetch(subset),
    body: {
      query: {
        bool: {
          filter: {
            term: { genes: gene.symbol },
          },
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .filter((variant: any) => variant.freq[subset].ac > 0)
    .map((variant: any) => {
      let majorConsequence = variant.consequences.find((csq: any) =>
        csq.genes.includes(gene.symbol)
      )
      if (majorConsequence) {
        majorConsequence = majorConsequence.consequence
      } else if (variant.intergenic) {
        majorConsequence = 'intergenic'
      }

      return {
        ...variant,
        ...variant.freq[subset],
        major_consequence: majorConsequence,
      }
    })
}

export const fetchStructuralVariantsByRegion = async (
  esClient: any,
  datasetId: SvDatasetId,
  region: RegionQueryParams
) => {
  const { index, subset } = datasetDependentQueryParams[datasetId]
  const hits = await fetchAllSearchResults(esClient, {
    index,
    type: '_doc',
    size: 10000,
    _source: esFieldsToFetch(subset),
    body: {
      query: {
        bool: {
          should: [
            {
              bool: {
                must: [
                  { range: { xpos: { lte: region.xstop } } },
                  { range: { xend: { gte: region.xstart } } },
                ],
              },
            },
            {
              bool: {
                must: [
                  { range: { xpos2: { lte: region.xstop } } },
                  { range: { xend2: { gte: region.xstart } } },
                ],
              },
            },
          ],
        },
      },
      sort: [{ xpos: { order: 'asc' } }],
    },
  })

  return hits
    .map((hit: any) => hit._source.value)
    .filter((variant: any) => variant.freq[subset].ac > 0)
    .filter((variant: any) => {
      // Only include insertions if the start point falls within the requested region.
      if (variant.type === 'INS') {
        return (
          variant.chrom === region.chrom &&
          variant.pos >= region.start &&
          variant.pos <= region.stop
        )
      }

      // Only include interchromosomal variants (CTX, BND) if one of the endpoints falls within the requested region.
      // Some INS and CPX variants are also interchromosomal, but those can only be queried on their first position.
      if (variant.type === 'BND' || variant.type === 'CTX') {
        return (
          (variant.chrom === region.chrom &&
            variant.pos >= region.start &&
            variant.pos <= region.stop) ||
          (variant.chrom2 === region.chrom &&
            variant.pos2 >= region.start &&
            variant.pos2 <= region.stop)
        )
      }

      return true
    })
    .map((variant: any) => {
      let majorConsequence = null
      if (variant.consequences.length) {
        majorConsequence = variant.consequences[0].consequence
      } else if (variant.intergenic) {
        majorConsequence = 'intergenic'
      }

      return {
        ...variant,
        ...variant.freq[subset],
        major_consequence: majorConsequence,
      }
    })
}
