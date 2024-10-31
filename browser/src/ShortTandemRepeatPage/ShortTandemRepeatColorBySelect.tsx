import React, { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'
import { ColorBy } from './ShortTandemRepeatPage'

const Label = styled.label`
  padding-right: 1em;
`

type Props = {
  id: string
  selectedColorBy: ColorBy | ''
  setSelectedColorBy: Dispatch<SetStateAction<ColorBy | ''>>
}

const ShortTandemRepeatColorBySelect = ({ id, selectedColorBy, setSelectedColorBy }: Props) => {
  return (
    <Label htmlFor={`short-tandem-repeat-${id}-color-by-select`}>
      Color By: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <Select
        id={`short-tandem-repeat-${id}-color-by-select`}
        value={selectedColorBy}
        onChange={(e: { target: { value: ColorBy | '' } }) => setSelectedColorBy(e.target.value)}
      >
        <option value="">None</option>
        <option value="quality_description">GQ: manual review</option>
        <option value="q_score">GQ: Q score</option>
        <option value="sex">Sex</option>
        <option value="population">Population</option>
      </Select>
    </Label>
  )
}

export default ShortTandemRepeatColorBySelect
