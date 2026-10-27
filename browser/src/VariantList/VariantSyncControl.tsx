import React from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import InfoButton from '../help/InfoButton'

export const VARIANT_SYNC_LABEL = 'Filter to variants present in both gnomAD and ClinVar tracks'
export const NO_SHARED_VARIANTS_MESSAGE = 'No variants match both sets of filters.'

export type VariantSyncState = {
  enabled: boolean
  available: boolean
  onChange: (enabled: boolean) => void
}

const VariantSyncControlWrapper = styled.div.withConfig({
  displayName: 'VariantSyncControlWrapper',
  componentId: 'variant-sync-control',
})({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5em',
})

type VariantSyncControlProps = {
  id: string
  state: VariantSyncState
}

export const VariantSyncControl = ({ id, state }: VariantSyncControlProps): React.ReactElement => {
  const unavailableMessage = state.enabled
    ? 'Sync is suspended because ClinVar data is unavailable.'
    : 'Sync is unavailable because ClinVar data is unavailable.'

  return (
    <VariantSyncControlWrapper>
      <Checkbox
        id={id}
        label={VARIANT_SYNC_LABEL}
        checked={state.enabled}
        disabled={!state.available}
        onChange={state.onChange}
      />
      <InfoButton topic="filtering-gnomad-and-clinvar-to-matching-variants" />
      {!state.available && <span role="status">{unavailableMessage}</span>}
    </VariantSyncControlWrapper>
  )
}

export default VariantSyncControl
