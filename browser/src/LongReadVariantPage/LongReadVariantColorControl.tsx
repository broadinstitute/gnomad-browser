import React from 'react'
import styled from 'styled-components'
import { Select } from '@gnomad/ui'

import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { COLOR_MODES } from './variantColorUtils'

const ColorControls = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const VariantColorHelp = () => (
  <>
    <p style={{ marginTop: 0 }}>
      This control changes only how variants are colored in the Summary and Haplotype
      visualizations. It does not filter variants and does not indicate pathogenicity, quality,
      clinical significance, or statistical significance.
    </p>

    <h4 style={{ margin: '16px 0 8px' }}>Variant Type</h4>
    <p>
      Categorical colors identify the called allele type: SNVs are blue, insertions are pink,
      deletions are red, duplications are blue, multiallelic copy-number variants are purple,
      inversions are orange, complex variants are green, other or breakend variants are dark green,
      and tandem repeats are gold. Shape and track band also encode broad variant category.
    </p>

    <h4 style={{ margin: '16px 0 8px' }}>Allele Fingerprint</h4>
    <p>
      A deterministic color is generated from each variant ID. Matching IDs keep the same color; the
      hue is an identity aid, not a biological annotation.
    </p>

    <h4 style={{ margin: '16px 0 8px' }}>Position</h4>
    <p>
      A continuous blue-to-red scale follows genomic position from the start to the end of the
      displayed region.
    </p>

    <h4 style={{ margin: '16px 0 8px' }}>Allele Frequency</h4>
    <p>
      A logarithmic grayscale runs from light gray at lower allele frequency to dark gray at higher
      allele frequency, clamped between 0.1 and 1.
    </p>

    <h4 style={{ margin: '16px 0 8px' }}>Haplotype Count</h4>
    <p style={{ marginBottom: 0 }}>
      In Haplotype View, a light-gray-to-red scale represents how many displayed haplotype rows
      contain the variant, relative to the total number of rows. The Summary track has no
      haplotype-row context, so it uses the scale&rsquo;s light-gray endpoint.
    </p>
  </>
)

type Props = {
  value: string
  onChange: (value: string) => void
}

const LongReadVariantColorControl = ({ value, onChange }: Props) => (
  <ColorControls data-testid="lr-variant-color-control">
    <label htmlFor="lr-variant-color-mode" style={{ fontSize: '12px' }}>
      Color:
    </label>
    <Select
      id="lr-variant-color-mode"
      value={value}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
    >
      {COLOR_MODES.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </Select>
    <HaplotypeHelpButton title="About variant colors">
      <VariantColorHelp />
    </HaplotypeHelpButton>
  </ColorControls>
)

export default LongReadVariantColorControl
