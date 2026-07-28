import React from 'react'
import styled from 'styled-components'
import { SegmentedControl } from '@gnomad/ui'

import LongReadCohortSelector, { LongReadCohort } from '../RegionPage/LongReadCohortSelector'

const Controls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  max-width: 100%;
`

type Props = {
  cohort: LongReadCohort
  onChangeCohort?: (cohort: LongReadCohort) => void
  showHaplotypes: boolean
  haplotypesDisabled: boolean
  onChangeShowHaplotypes: (showHaplotypes: boolean) => void
}

const LongReadViewControls = ({
  cohort,
  onChangeCohort,
  showHaplotypes,
  haplotypesDisabled,
  onChangeShowHaplotypes,
}: Props) => (
  <Controls data-testid="long-read-view-controls">
    {onChangeCohort && <LongReadCohortSelector value={cohort} onChange={onChangeCohort} />}
    <SegmentedControl
      id="lr-view-mode"
      options={[
        { label: 'Summary View', value: 'summary' },
        { label: 'Haplotype View', value: 'haplotype', disabled: haplotypesDisabled },
      ]}
      value={showHaplotypes ? 'haplotype' : 'summary'}
      onChange={(value: string) => onChangeShowHaplotypes(value === 'haplotype')}
    />
  </Controls>
)

export default LongReadViewControls
