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
  allowedColorBys?: ColorBy[]
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
  allowedColorBys = ['quality_description', 'q_score', 'sex', 'population'],
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
        {allowedColorBys.map((key) => (
          <option key={key} value={key}>
            {colorByLabels[key]}
          </option>
        ))}
      </Select>
    </Label>
  )
}

export default ShortTandemRepeatColorBySelect
