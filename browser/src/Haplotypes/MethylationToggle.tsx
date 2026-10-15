import React, { useId } from 'react'

import { JOINED_ZOOM_NEEDED, type JoinedPhasedMethylationCapability } from '../LongReadVariantPage/perCopyMethylation'
import HaplotypeHelpButton from './HelpButton'
import { PerCopyMethylationHelp } from './MethylationHelp'

type Props = {
  capability?: JoinedPhasedMethylationCapability | null
  usable: boolean
  unavailableReason?: string | null
  checked: boolean
  onChange: (checked: boolean) => void
}

// Capability reasons are diagnostics, not UI copy (they may contain server errors or provenance).
const unavailableHelp = (capability: Props['capability'], checking: boolean) => {
  if (checking) return 'Checking whether per-copy methylation is available for this region.'
  switch (capability?.status) {
    case 'UNAVAILABLE_NOT_CONFIGURED':
      return 'Methylation measurements cannot yet be matched to the haplotype copies shown here.'
    case 'UNAVAILABLE_AOU_SUMMARY_ONLY':
      return 'Per-copy methylation is not available for this cohort.'
    case 'UNAVAILABLE_ORIENTATION_EXCLUDED_CONTIG':
      return 'Per-copy methylation is not available for this chromosome.'
    default:
      return 'Per-copy methylation is currently unavailable for this region.'
  }
}

const MethylationToggle = ({ capability, usable, unavailableReason, checked, onChange }: Props) => {
  const statusId = useId()
  const checking = !capability && (!unavailableReason || unavailableReason === 'Per-copy methylation capability is loading')
  const zoomNeeded = unavailableReason === JOINED_ZOOM_NEEDED
  const help = zoomNeeded ? JOINED_ZOOM_NEEDED : unavailableHelp(capability, checking)
  return (
    <>
      <label
        title={usable ? undefined : help}
        style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: usable ? 'pointer' : 'not-allowed' }}
      >
        <input
          type="checkbox"
          checked={checked && usable}
          disabled={!usable}
          aria-describedby={usable ? undefined : statusId}
          onChange={(event) => onChange(event.target.checked)}
        />
        Methylation
      </label>
      {!usable && <span id={statusId} role="status" style={{ color: '#666', fontSize: '11px' }}>
        {checking ? 'Checking…' : zoomNeeded ? 'Zoom in' : 'Unavailable'}
      </span>}
      <HaplotypeHelpButton title="Methylation">
        {usable ? <PerCopyMethylationHelp capability={capability} /> : <>
          <p>{help}</p>
          {!checking && !zoomNeeded && <p>Unavailable does not mean zero methylation.</p>}
        </>}
      </HaplotypeHelpButton>
    </>
  )
}

export default MethylationToggle
