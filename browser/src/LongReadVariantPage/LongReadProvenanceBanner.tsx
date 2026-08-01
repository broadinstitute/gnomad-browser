export type LongReadDataSource =
  | 'Y1_ACCEPTED'
  | 'Y1_DATABASE'
  | 'LEGACY_V1'
  | 'EXTERNAL_REFERENCE'
  | 'UNAVAILABLE'

export type LongReadSourceProvenance = {
  modality: string
  source: LongReadDataSource
  database?: string | null
  release?: string | null
  cohort?: string | null
  reference_genome?: string | null
  chromosome?: string | null
  scope?: string | null
  run_id?: string | null
  status?: string | null
  available: boolean
  label: string
}

export type LongReadY1Provenance = {
  enabled: boolean
  scope_label?: string | null
  sources: LongReadSourceProvenance[]
}

export const sourceForModality = (
  provenance: LongReadY1Provenance | null | undefined,
  modality: string
) => provenance?.sources?.find((source) => source.modality === modality)

export const modalityAvailable = (
  provenance: LongReadY1Provenance | null | undefined,
  modality: string
) => sourceForModality(provenance, modality)?.available === true
