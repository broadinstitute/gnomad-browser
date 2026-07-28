import React from 'react'
import styled from 'styled-components'
import { SegmentedControl } from '@gnomad/ui'

export type LongReadCohort = 'hgsvc_hprc' | 'aou'

const CohortControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
`

type Props = {
  value: LongReadCohort
  onChange: (cohort: LongReadCohort) => void
}

const LongReadCohortSelector = ({ value, onChange }: Props) => (
  <CohortControl role="group" aria-labelledby="lr-cohort-label">
    <span id="lr-cohort-label">Long-read cohort:</span>
    <SegmentedControl
      id="lr-cohort"
      options={[
        { label: 'HGSVC/HPRC', value: 'hgsvc_hprc' },
        { label: 'All of Us', value: 'aou' },
      ]}
      value={value}
      onChange={(cohort: string) => onChange(cohort as LongReadCohort)}
    />
  </CohortControl>
)

export default LongReadCohortSelector
