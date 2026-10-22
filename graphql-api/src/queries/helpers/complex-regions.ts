import { DatasetId, ReferenceGenome } from '../../../../dataset-metadata/metadata'

export interface ComplexRegionRule {
  readonly id: string
  readonly geneSymbol: string
  readonly datasets: readonly DatasetId[]
  readonly referenceGenome: ReferenceGenome
  readonly chrom: string
  /** Use one-based inclusive coordinates. */
  readonly start: number
  readonly stop: number
  readonly maxVariants: number
}

const GRCH38_VARIANT_DATASETS: readonly DatasetId[] = [
  'gnomad_r3',
  'gnomad_r3_controls_and_biobanks',
  'gnomad_r3_non_cancer',
  'gnomad_r3_non_neuro',
  'gnomad_r3_non_topmed',
  'gnomad_r3_non_v2',
  'gnomad_r4',
  'gnomad_r4_non_ukb',
]

const complexRegions: readonly ComplexRegionRule[] = [
  {
    id: 'mapk10-grch38',
    geneSymbol: 'MAPK10',
    datasets: GRCH38_VARIANT_DATASETS,
    referenceGenome: 'GRCh38',
    chrom: '4',
    start: 85990007,
    stop: 86594625,
    maxVariants: 10000,
  },
  {
    id: 'pcbp1-as1-grch38',
    geneSymbol: 'PCBP1-AS1',
    datasets: GRCH38_VARIANT_DATASETS,
    referenceGenome: 'GRCh38',
    chrom: '2',
    start: 69960104,
    stop: 70103220,
    maxVariants: 10000,
  },
]

export default complexRegions
