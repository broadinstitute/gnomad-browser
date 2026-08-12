import React from 'react'
import styled from 'styled-components'

const Badge = styled.span<{ $limited: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px ${(props) => (props.$limited ? 'dashed' : 'solid')} ${(props) => (props.$limited ? '#8a4b08' : '#39754a')};
  border-radius: 999px;
  background: ${(props) => (props.$limited ? '#fff8e8' : '#edf7ef')};
  color: ${(props) => (props.$limited ? '#714000' : '#245b33')};
  font-size: 11px;
  white-space: normal;
`

export const MethylationSupportBadge = ({
  state,
  reasons,
}: {
  state: string
  reasons: readonly string[]
}) => {
  const limited = state !== 'adequate' && state !== 'balanced-enough'
  const label = state.replace(/-/g, ' ')
  return (
    <Badge $limited={limited} title={reasons.join(' ')} aria-label={`${label}. ${reasons.join(' ')}`}>
      <span aria-hidden="true">{limited ? '△' : '●'}</span>
      {label}
    </Badge>
  )
}

export default MethylationSupportBadge
