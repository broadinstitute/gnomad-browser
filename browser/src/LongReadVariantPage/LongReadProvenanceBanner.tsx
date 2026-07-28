export type LongReadDataSource =
  | 'Y1_ACCEPTED_R2'
  | 'LEGACY_V1'
  | 'MIXED_PROVENANCE_PROTOTYPE'
  | 'EXTERNAL_REFERENCE'
  | 'UNAVAILABLE'

export type LongReadSourceProvenance = {
  modality: string
  source: LongReadDataSource
  release?: string | null
  cohort?: string | null
  reference_genome?: string | null
  chromosome?: string | null
  run_id?: string | null
  status?: string | null
  available: boolean
  label: string
}

export type LongReadPrototypeProvenance = {
  enabled: boolean
  mixed_provenance: boolean
  scope_label?: string | null
  warning?: string | null
  sources: LongReadSourceProvenance[]
}

export const sourceForModality = (
  provenance: LongReadPrototypeProvenance | null | undefined,
  modality: string
) => provenance?.sources?.find((source) => source.modality === modality)

export const modalityAvailable = (
  provenance: LongReadPrototypeProvenance | null | undefined,
  modality: string
) => sourceForModality(provenance, modality)?.available === true
