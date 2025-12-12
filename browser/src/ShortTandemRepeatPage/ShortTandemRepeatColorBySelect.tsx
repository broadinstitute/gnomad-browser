import React, { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'
import { ColorBy, ScaleType } from './ShortTandemRepeatAlleleSizeDistributionPlot'

const Label = styled.label`
  padding-right: 1em;
  white-space: nowrap;
`

type Props = {
  id: string
  selectedColorBy: ColorBy | null
  setSelectedColorBy: (newColorBy: ColorBy | null) => void
  setSelectedScaleType: Dispatch<SetStateAction<ScaleType>>
}

export const colorByLabels: Record<ColorBy, string> = {
  quality_description: 'GQ: manual review',
  q_score: 'GQ: Q score',
  sex: 'Sex',
  population: 'Genetic ancestry group',
}

const ShortTandemRepeatColorBySelect = ({
  id,
  selectedColorBy,
  setSelectedColorBy,
  setSelectedScaleType,
}: Props) => {
  return (
    <Label htmlFor={`short-tandem-repeat-${id}-color-by-select`}>
      Color by: &nbsp;
      <Select
        id={`short-tandem-repeat-${id}-color-by-select`}
        value={selectedColorBy || ''}
        onChange={(e: { target: { value: ColorBy | '' } }) => {
          setSelectedColorBy(e.target.value === '' ? null : e.target.value)
          if (e.target.value === 'quality_description') {
            setSelectedScaleType('linear-truncated-50')
          }
        }}
      >
        <option key="" value="">
          None
        </option>
        {Object.entries(colorByLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </Select>
    </Label>
  )
}

export default ShortTandemRepeatColorBySelect
