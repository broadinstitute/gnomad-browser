export type LongReadTrReferenceStatus =
  | 'EXACT_UNIQUE'
  | 'AMBIGUOUS'
  | 'COORDINATE_MISMATCH'
  | 'ORIENTATION_DIAGNOSTIC'
  | 'MOTIF_MISMATCH'
  | 'SOURCE_ABSENT'
  | 'UNAVAILABLE'

export type LongReadTrReferenceComponent = {
  chrom: string
  start0: number
  end0: number
  motif: string
}

export type LongReadTrReferenceCandidate = {
  canonical_id: string
  matched_component_index: number
  matched_component: LongReadTrReferenceComponent
  matched_reference_region_index: number
  source_record_count: number
  source_record_membership_sha256: string
}

export type LongReadTrReferenceDiagnosticSourceRecord = {
  cohort: 'hgsvc_hprc' | 'aou'
  chrom: string
  run_id: string
  source_record_id: string
  position: number
}

export type LongReadTrReferenceDiagnosticCandidate = {
  canonical_id: string
  ordered_component_index: number
  ordered_component: LongReadTrReferenceComponent
  motif_relation: string
  source_record_count: number
  source_record_membership_sha256: string
  source_records: LongReadTrReferenceDiagnosticSourceRecord[]
  source_records_truncated: boolean
}

export type LongReadTrReferenceCohortResult = {
  status: LongReadTrReferenceStatus
  reason_code: string | null
  proof_text: string
  source_database: string
  source_release: string
  source_run_id: string
  candidates: LongReadTrReferenceCandidate[]
  diagnostic_candidates: LongReadTrReferenceDiagnosticCandidate[]
  diagnostic_candidate_identity_count: number
  diagnostic_candidates_truncated: boolean
  diagnostic_candidate_identity_sha256: string
}

export type LongReadTrReferenceDisease = {
  name: string
  symbol?: string | null
  omim_id?: string | null
}

export type LongReadTrReferenceRow = {
  short_record: {
    id: string
    gene: {
      symbol: string
    }
    main_reference_region: {
      reference_genome: string
      chrom: string
      start: number
      stop: number
    }
    reference_repeat_unit: string
    associated_diseases: LongReadTrReferenceDisease[]
  }
  hgsvc_hprc: LongReadTrReferenceCohortResult
  aou: LongReadTrReferenceCohortResult
}

export type LongReadTrReferenceProvenance = {
  dataset: string
  source: string
  endpoint: string
  queried_at: string
  row_count: number
  compact_sha256: string
  hard_ceiling: number
  reference_genome: string
  coordinate_system: string
  motif_identity: string
  catalog_available: boolean
  catalog_unavailable_reason: string | null
  snapshot_contract_id: string
  snapshot_contract_label: string
  snapshot_contract_scope: string
  snapshot_approval_state: string
  current_trexplorer_admitted: boolean
  admitted_component_index_complete: boolean
  admitted_component_index_database: string
  admitted_component_index_release: string
  admitted_component_index_source_count: number
  admitted_component_index_source_record_count: number
  admitted_component_index_canonical_locus_count: number
  admitted_component_index_ordered_component_count: number
  admitted_component_index_inventory_sha256: string
  diagnostic_max_candidates_per_status: number
  diagnostic_max_source_records_per_candidate: number
}

export type ReferenceMatchFilter =
  | 'all'
  | 'either'
  | 'both'
  | 'hgsvc_hprc_only'
  | 'aou_only'
  | 'none'
  | 'multiple'
  | 'unavailable_ambiguous'

export type ReferenceSort = 'id' | 'genomic' | 'motif' | 'hgsvc_hprc' | 'aou'

export type ReferenceFilters = {
  query: string
  chrom: string
  match: ReferenceMatchFilter
  sort: ReferenceSort
}
