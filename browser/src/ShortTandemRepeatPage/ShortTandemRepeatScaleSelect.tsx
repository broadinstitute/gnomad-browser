import React, { Dispatch, SetStateAction } from 'react'
import { Select } from '@gnomad/ui'
import { ScaleType, ColorBy } from './ShortTandemRepeatAlleleSizeDistributionPlot'
import { logScaleAllowed } from './ShortTandemRepeatPage'
import styled from 'styled-components'

const Label = styled.label`
  padding-right: 1em;
  white-space: nowrap;
`

type Props = {
  id: string
  selectedScaleType: ScaleType
  setSelectedScaleType: Dispatch<SetStateAction<ScaleType>>
  selectedColorBy: ColorBy | null
}

const ShortTandemRepeatScaleSelect = ({
  id,
  selectedScaleType,
  setSelectedScaleType,
  selectedColorBy,
}: Props) => {
  return (
    <Label htmlFor={`short-tandem-repeat-${id}-allele-size-distribution-scale`}>
      y-Scale: &nbsp;
      <Select
        id={`short-tandem-repeat-${id}-allele-size-distribution-scale`}
        value={selectedScaleType}
        onChange={(e: { target: { value: ScaleType } }) => {
          setSelectedScaleType(e.target.value)
        }}
      >
        <option value="linear">Linear</option>
        {logScaleAllowed(selectedColorBy) && <option value="log">Log</option>}
        <option value="linear-truncated-50">Linear: Truncated at 50</option>
        <option value="linear-truncated-200">Linear: Truncated at 200</option>
        <option value="linear-truncated-1000">Linear: Truncated at 1000</option>
      </Select>
    </Label>
  )
}

export default ShortTandemRepeatScaleSelect
