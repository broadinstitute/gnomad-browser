import React from 'react'
import styled from 'styled-components'
import type { MethylationViewMode } from './methylationTypes'

const Control = styled.fieldset`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 8px 12px;
  border: 0;
  background: #f8f9fa;

  legend {
    float: left;
    margin-right: 8px;
    padding: 0;
    font-size: 12px;
    font-weight: 600;
  }

  label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 44px;
    padding: 6px 10px;
    border: 1px solid #9aa0a6;
    border-radius: 4px;
    background: #fff;
    font-size: 12px;
    cursor: pointer;
  }

  label:has(input:checked) {
    border-color: #2a6f97;
    background: #e8f2f8;
    font-weight: 600;
  }

  input {
    margin: 0 5px 0 0;
  }

  @media (max-width: 390px) {
    align-items: stretch;

    legend {
      width: 100%;
    }

    label {
      flex: 1 1 90px;
    }
  }
`

const OPTIONS: Array<{ value: MethylationViewMode; label: string }> = [
  { value: 'sites', label: 'CpG sites' },
  { value: 'groups', label: 'CpG groups' },
  { value: 'both', label: 'Both' },
]

export const MethylationViewControls = ({
  value,
  onChange,
}: {
  value: MethylationViewMode
  onChange: (mode: MethylationViewMode) => void
}) => (
  <Control aria-label="Methylation view">
    <legend>Methylation view:</legend>
    {OPTIONS.map((option) => (
      <label key={option.value}>
        <input
          type="radio"
          name="methylation-view"
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
        {option.label}
      </label>
    ))}
  </Control>
)

export default MethylationViewControls
