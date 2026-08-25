import { TrLocusComponent } from '@gnomad/dataset-metadata/longReadTrLocusId'

import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'

type Frequency = { ac: number; an: number; af: number }
export type ExactAlleleFrequency = {
  all: Frequency
  populations: { id: string; ac: number; an: number; af: number }[]
}

export type LongReadTrAllele = {
  variant_id: string
  source_variant_id: string
  alt_index: number
  alt_count: number
  ref: string | null
  alt: string | null
  length: number | null
  repeat_count: number | null
  repeat_count_source: string | null
  motif_purity: number | null
  freq: ExactAlleleFrequency
}

export type LongReadTrSelectedAllele = Omit<LongReadTrAllele, 'ref' | 'alt'> & {
  ref: string
  alt: string
  motif_purity_source: string | null
  decomposition_status: string
  decomposition_reason: string
  rsids: string[]
  filters: string[]
  major_consequence: string | null
  cadd_phred: number | null
  phylop: number | null
  short_read_match_id: string | null
  short_read_match_type: string | null
  short_read_match_source: string | null
  source_release: string
  source_run_id: string
}

export type AlleleStack = {
  ancestry_group: string | null
  sex: string | null
  called_alleles: number
}

export type AlleleBin = {
  delta: number
  called_alleles: number
  exact_alt_count: number
  allele_ids: string[]
  stacks: AlleleStack[]
}

export type PurityPoint = {
  allele_id: string
  delta: number
  motif_purity: number
  called_alleles: number
}

export type WholeRecordAlleleLandscapeData = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code: string | null
  unit: 'WHOLE_RECORD_DELTA_BP'
  called_alleles: number | null
  non_reference_called_alleles: number | null
  reference_called_alleles: number | null
  exact_alt_count: number | null
  stratified_available: boolean | null
  stratified_unavailable_reason: string | null
  ancestry_groups: string[] | null
  sexes: string[] | null
  bins: AlleleBin[] | null
  purity_points: PurityPoint[] | null
  purity_available: boolean | null
  purity_unavailable_reason: string | null
}

export type GenotypePair = {
  shorter_allele_id: string
  longer_allele_id: string
  ancestry_group: string
  sex: string
  people: number
  phased_people: number
  unphased_people: number
}

export type GenotypeCell = {
  shorter_delta: number
  longer_delta: number
  people: number
  pairs: GenotypePair[]
}

export type WholeRecordGenotypeLandscapeData = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code: string | null
  unit: 'WHOLE_RECORD_DELTA_BP'
  reference_allele_id: string | null
  called_samples: number | null
  called_alleles: number | null
  ancestry_groups: string[] | null
  sexes: string[] | null
  cells: GenotypeCell[] | null
}

export type RepeatCountPlots = {
  status: string
  reason_code: string | null
  repeat_unit: string | null
  max_repunits: number | null
  allele_size_distribution: any[]
  genotype_distribution: any[]
}

export type ShortReadCatalogDisease = {
  name: string
  symbol: string
  omim_id: string | null
  inheritance_mode: string
  repeat_size_classifications: {
    classification: string
    min: number | null
    max: number | null
  }[]
  notes: string | null
}

export type ShortReadCatalogRecord = {
  id: string
  gene: { ensembl_id: string; symbol: string; region: string }
  associated_diseases: ShortReadCatalogDisease[]
  stripy_id: string | null
  strchive_id: string | null
  main_reference_region: {
    reference_genome: string
    chrom: string
    start: number
    stop: number
  }
  reference_regions: {
    reference_genome: string
    chrom: string
    start: number
    stop: number
  }[]
  reference_repeat_unit: string
  repeat_units: { repeat_unit: string; classification: string }[]
}

export type LongReadTrShortReadContext = {
  status:
    | 'EXACT_UNIQUE'
    | 'NONE'
    | 'MULTIPLE'
    | 'AMBIGUOUS_CATALOG'
    | 'AMBIGUOUS_COMPONENT'
    | 'CATALOG_UNAVAILABLE'
    | 'UNAVAILABLE'
  reason_code: string | null
  catalog_dataset: string
  catalog_source: string
  catalog_digest: string
  catalog_record: ShortReadCatalogRecord | null
  matched_component_index: number | null
  matched_component: TrLocusComponent | null
  matched_reference_region_index: number | null
  exact_reference_component_outline_authorized: boolean
  matched_reference_repeat_unit_classifications: string[]
  lr_database: string | null
  lr_release: string | null
  lr_run_id: string | null
  lr_cohort: LongReadCohort | null
}

export type LongReadTrLocus = {
  id: string
  source_trid: string
  reference_genome: string
  chrom: string
  region: { chrom: string; start0: number; end0: number; size: number }
  motifs: string[]
  structure: string | null
  lr_cohort: LongReadCohort
  source_release: string
  source_run_id: string
  total_alleles: number
  exact_alt_count: number
  exact_alt_count_complete: boolean
  exact_alt_count_unavailable_reason: string | null
  delta_min: number | null
  delta_max: number | null
  delta_unavailable_reason: string | null
  called_allele_count: number | null
  called_sample_count: number | null
  unique_carrier_count: number | null
  sequences_available: boolean
  sequences_unavailable_reason: string | null
  selected_allele_valid: boolean | null
  selected_allele_unavailable_reason: string | null
  selected_allele: LongReadTrSelectedAllele | null
  component_measurement_available: boolean
  component_measurement_unavailable_reason: string | null
  components: TrLocusComponent[]
  source_records: {
    record_index: number
    source_variant_id: string
    task_id: string | null
    attempt_id: string | null
    position: number
    alt_count: number
    ref: string | null
    non_reference_ac: number
    an: number
    non_reference_af: number
    source: string | null
    region: string | null
  }[]
  short_read_context: LongReadTrShortReadContext | null
  whole_record_allele_landscape: WholeRecordAlleleLandscapeData
  whole_record_genotype_landscape: WholeRecordGenotypeLandscapeData
  repeat_count_plots: RepeatCountPlots
  alleles: {
    nodes: LongReadTrAllele[]
    page_info: { has_next_page: boolean }
  }
}

export type AlleleNavigation = {
  hrefForAllele: (alleleId: string) => string
  onSelectAllele: (alleleId: string) => void
}
