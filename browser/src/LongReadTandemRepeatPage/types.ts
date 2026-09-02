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
  interaction: {
    interaction_status: 'UNAVAILABLE_PLOTS' | 'UNAVAILABLE_SOURCE_IDENTITIES'
    reason: string
  }
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
  lr_database: string | null
  lr_release: string | null
  lr_run_id: string | null
  lr_cohort: LongReadCohort | null
}

export type LongReadTrPrimaryRepeat = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code:
    | 'IDENTITY_CONTEXT_UNAVAILABLE'
    | 'WRONG_ASSEMBLY'
    | 'INVALID_STORED_MOTIF'
    | 'MAIN_REGION_NOT_EXACT_COMPONENT'
    | 'STORED_MOTIF_NOT_EXACT_COMPONENT'
    | 'NON_BIJECTIVE_COMPONENT'
    | 'CATALOG_DIGEST_MISMATCH'
    | 'REGISTRY_DIGEST_MISMATCH'
    | 'REGISTRY_NOT_REVIEWED'
    | 'REGISTRY_IDENTITY_MISMATCH'
    | 'COMPOUND_PRIMARY_REPEAT_UNREVIEWED'
    | null
  motif: string | null
  component_index: number | null
  component: TrLocusComponent | null
  selection_basis:
    | 'EXACT_MAIN_CATALOG_COMPONENT'
    | 'LR_SOLE_COMPONENT'
    | 'REVIEWED_PRIMARY_REPEAT_REGISTRY'
    | null
  biological_role: string | null
  catalog_id: string | null
  catalog_digest: string | null
  registry_digest: string | null
}

export type PrimaryMotifMeasurementData = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code:
    | 'PUBLIC_PRODUCT_NOT_APPROVED'
    | 'PRIMARY_REPEAT_IDENTITY_UNAVAILABLE'
    | 'SOURCE_RECORD_COUNT_NOT_ONE'
    | 'NO_ACCEPTED_PRODUCT_RUN'
    | 'PRODUCT_IDENTITY_MISMATCH'
    | 'PRODUCT_INCOMPLETE'
    | 'PRODUCT_BOUND_EXCEEDED'
    | 'PRODUCT_QUERY_FAILED'
    | null
  motif: string | null
  biological_role: string | null
  metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1'
  unit: 'EXACT_PRIMARY_MOTIF_UNITS'
  scope: 'WHOLE_REPRESENTED_ALLELE'
  called_alleles: number | null
  reference_alleles: number | null
  alternate_alleles: number | null
  alternate_identities_checked: number | null
  bins: { exact_units: number; allele_copies: number }[]
  genotype: {
    status: 'AVAILABLE' | 'UNAVAILABLE'
    reason_code:
      | 'AGGREGATE_ONLY_SOURCE_NO_GT_PAIRING'
      | 'SOURCE_COMPLETE_GENOTYPES_UNAVAILABLE'
      | 'PRODUCT_INCOMPLETE'
      | 'PRODUCT_BOUND_EXCEEDED'
      | null
    called_diploid_people: number | null
    no_call_people: number | null
    cells: {
      shorter_exact_units: number
      longer_exact_units: number
      people: number
    }[]
  }
  provenance: {
    product_run_id: string
    primary_database: string
    primary_run_id: string
    primary_task_id: string
    primary_attempt_id: string
    source_variant_id: string
    registry_digest: string
    registry_approval_state: string
    algorithm_version: string
    algorithm_sha256: string
    anchor_rule: string
    source_record_sha256: string
    allele_receipt_sha256: string
    genotype_receipt_sha256: string | null
    bounds_status: string
    serialized_bytes: number
    returned_bins: number
    returned_cells: number
  } | null
}

export type LongReadTrPresentation = {
  source_representation_kind: 'STANDALONE_TR' | 'VARIATION_CLUSTER' | 'UNKNOWN'
  presentation_layout: 'REPEAT_FOCUSED' | 'CLUSTER_FOCUSED'
  presentation_reason:
    | 'SOLE_EXACT_COMPONENT'
    | 'REVIEWED_PRIMARY_REPEAT'
    | 'SOURCE_VARIATION_CLUSTER'
    | 'MULTI_COMPONENT_FALLBACK'
  classification_source: string | null
  classification_release: string | null
  classification_digest: string | null
  reviewed_override_digest: string | null
}

export type LongReadTrBounds = {
  component_envelope_start0: number
  component_envelope_end0: number
  component_envelope_length_bp: number
  component_envelope_basis: 'EXACT_ORDERED_COMPONENTS'
  source_ref_span_start0: number | null
  source_ref_span_end0: number | null
  source_ref_span_status: 'AVAILABLE_EXACT' | 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT'
  variation_cluster_start0: number | null
  variation_cluster_end0: number | null
  variation_cluster_length_bp: number | null
  variation_cluster_status: 'AVAILABLE_EXACT' | 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION'
  bounds_source: string | null
  bounds_release: string | null
  bounds_digest: string | null
}

export type LongReadTrSequenceCardinality = {
  source_alt_identity_count: number
  unique_alt_sequence_count: number | null
  all_source_alts_sequence_complete: boolean
  status: 'AVAILABLE_EXACT' | 'UNAVAILABLE'
  reason: string | null
  algorithm_version: string
}

export type LongReadTrRepresentedLength = {
  status: 'AVAILABLE_EXACT' | 'UNAVAILABLE'
  reason: string | null
  represented_ref_length_bp: number | null
  represented_alt_min_length_bp: number | null
  represented_alt_max_length_bp: number | null
  source_delta_provenance:
    | 'INFO_ALLELE_LENGTH'
    | 'INFO_SVLEN'
    | 'SEQUENCE_DERIVED'
    | 'MIXED'
    | 'UNAVAILABLE'
  sequence_length_provenance: string | null
  sequence_source_record_digest: string | null
  sequence_content_digest: string | null
  anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1' | null
  anchor_rule_source: string | null
  anchor_rule_release: string | null
  anchor_rule_digest: string | null
  reconciliation_status: 'NOT_EVALUATED' | 'NOT_RECONCILED' | 'MISMATCH' | 'RECONCILED'
}

export type LongReadTrFilterGroup = {
  id: string
  label: string
  kind: 'SOURCE_GROUP' | 'SOURCE_UNKNOWN'
  source_frequency_keys: string[]
  source_metadata_keys: string[]
  available_in_frequency: boolean
  available_in_genotype: boolean
  shared_available: boolean
  unavailable_reason: string | null
}

export type LongReadTrFilterContract = {
  status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE'
  reason: string | null
  ancestry_mapping_status: 'APPROVED_EXACT' | 'UNAVAILABLE_PENDING_OWNER_APPROVAL'
  sex_mapping_status: 'APPROVED_EXACT' | 'UNAVAILABLE_PENDING_OWNER_APPROVAL'
  ancestry_groups: LongReadTrFilterGroup[]
  sex_groups: LongReadTrFilterGroup[]
  ancestry_control_redundant: boolean
  ancestry_control_redundancy_reason: string
  available_color_dimensions: ('ANCESTRY' | 'SEX')[]
  allele_color_dimensions: ('ANCESTRY' | 'SEX')[]
  genotype_color_dimensions: ('ANCESTRY' | 'SEX')[]
  unstratified_policy: string
  vocabulary_release: string | null
  vocabulary_digest: string | null
  source_key_inventory_release: string
  source_key_inventory_digest: string
  source_release: string
  source_run_id: string
  metadata_source_run_id: string | null
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
  accepted_task_attempt_digest: string
  presentation: LongReadTrPresentation
  bounds: LongReadTrBounds
  component_summary: {
    ordered_component_count: number
    distinct_stored_motif_count: number
  }
  sequence_cardinality: LongReadTrSequenceCardinality
  represented_length: LongReadTrRepresentedLength
  filter_contract: LongReadTrFilterContract
  total_alleles: number
  exact_alt_count: number
  exact_alt_count_complete: boolean
  exact_alt_count_unavailable_reason: string | null
  delta_min: number | null
  delta_max: number | null
  delta_unavailable_reason: string | null
  represented_allele_length_min: number | null
  represented_allele_length_max: number | null
  represented_allele_length_unavailable_reason: string | null
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
  primary_repeat: LongReadTrPrimaryRepeat
  primary_motif_measurement: PrimaryMotifMeasurementData
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
