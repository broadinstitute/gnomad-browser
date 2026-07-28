import React from 'react'
import styled from 'styled-components'

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

const Banner = styled.aside`
  margin: 12px 0;
  padding: 12px 16px;
  border: 2px solid #b26a00;
  border-radius: 4px;
  background: #fff4d6;
  color: #4f3500;
  line-height: 1.45;

  ul {
    margin: 8px 0 0;
    padding-left: 20px;
  }
`

export const sourceForModality = (
  provenance: LongReadPrototypeProvenance | null | undefined,
  modality: string
) => provenance?.sources?.find((source) => source.modality === modality)

export const modalityAvailable = (
  provenance: LongReadPrototypeProvenance | null | undefined,
  modality: string
) => sourceForModality(provenance, modality)?.available === true

const LongReadProvenanceBanner = ({ provenance }: { provenance: LongReadPrototypeProvenance }) => {
  if (!provenance.enabled && !provenance.mixed_provenance) return null

  const visibleSources = provenance.sources.filter(
    (source) => source.available || source.source === 'UNAVAILABLE'
  )

  return (
    <Banner aria-label="Long-read data provenance" data-testid="lr-provenance-banner">
      <strong>Non-production chr22 mixed-provenance prototype.</strong>{' '}
      Variants, frequencies, accepted sample metadata, and HGSVC/HPRC haplotypes are from
      the isolated gnomAD LR Y1 accepted r2 serving dataset. Ancillary tracks come from a
      separate read-only mixed-provenance prototype database and are not Y1-accepted measurements. All of Us
      is summary-only. Missing or unavailable values are shown as unavailable, never as zero.
      {provenance.warning && <div>{provenance.warning}</div>}
      {provenance.scope_label && <div><strong>Scope:</strong> {provenance.scope_label}</div>}
      {visibleSources.length > 0 && (
        <ul>
          {visibleSources.map((source) => (
            <li key={source.modality} data-modality={source.modality}>
              <strong>{source.modality.replace(/_/g, ' ')}:</strong>{' '}
              {source.label}
              {source.run_id ? ` (${source.run_id})` : ''}
              {!source.available ? ' — Unavailable for this cohort/release' : ''}
            </li>
          ))}
        </ul>
      )}
    </Banner>
  )
}

export default LongReadProvenanceBanner
