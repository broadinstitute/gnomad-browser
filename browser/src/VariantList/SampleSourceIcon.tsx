import { transparentize } from 'polished'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor } from '@gnomad/ui'

const Icon = styled.span`
  padding: 1px 4px;
  border: 1px ${(props: any) => (props.isFiltered ? 'dashed' : 'solid')} #000;
  border-radius: 3px;
  margin-left: 10px;
  background-color: ${(props: any) =>
    // @ts-expect-error TS(2554) FIXME: Expected 1-2 arguments, but got 3.
    props.isFiltered ? transparentize(0.5, props.color, props.color) : props.color};
  color: white;
`

const abbreviations = {
  exome: 'E',
  genome: 'G',
}

const colors = {
  exome: 'rgb(70, 130, 180)',
  genome: 'rgb(115, 171, 61)',
}

type Props = {
  source: 'exome' | 'genome'
  filters: string[]
}

const SampleSourceIcon = ({ source, filters }: Props) => {
  const isFiltered = filters.length > 0

  let tooltip = `This variant is found in ${source} samples`
  if (isFiltered) {
    tooltip += `, where it failed the following filters: ${filters.join(', ')}`
  }

  return (
    // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message
    <TooltipAnchor tooltip={tooltip}>
      {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <Icon color={colors[source]} isFiltered={isFiltered}>
        {abbreviations[source]}
      </Icon>
    </TooltipAnchor>
  )
}

export default SampleSourceIcon
