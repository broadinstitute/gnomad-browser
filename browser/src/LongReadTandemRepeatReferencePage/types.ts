export type LongReadTrReferenceStatus =
  | 'EXACT_UNIQUE'
  | 'NONE'
  | 'MULTIPLE'
  | 'AMBIGUOUS_CATALOG'
  | 'AMBIGUOUS_COMPONENT'
  | 'UNAVAILABLE'

export type LongReadTrReferenceCandidate = {
  canonical_id: string
}

export type LongReadTrReferenceCohortResult = {
  status: LongReadTrReferenceStatus
  reason_code?: string | null
  source_database?: string | null
  source_release?: string | null
  source_run_id?: string | null
  candidates: LongReadTrReferenceCandidate[]
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
