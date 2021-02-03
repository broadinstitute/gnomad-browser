import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import StackedHistogram from '../StackedHistogram'
import ControlSection from '../VariantPage/ControlSection'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const CheckboxWrapper = styled.div`
  label {
    display: block;
    line-height: 1.5;
  }
`

const StructuralVariantAgeDistribution = ({ variant }) => {
  const [includeHeterozygotes, setIncludeHeterozygotes] = useState(true)
  const [includeHomozygotes, setIncludeHomozygotes] = useState(true)

  // Only show histogram if there is data to show
  const isAgeDataAvailable = [
    ...variant.age_distribution.het.bin_freq,
    variant.age_distribution.het.n_smaller,
    variant.age_distribution.het.n_larger,
    ...variant.age_distribution.hom.bin_freq,
    variant.age_distribution.hom.n_smaller,
    variant.age_distribution.hom.n_larger,
  ].some(n => n !== 0)

  if (!isAgeDataAvailable) {
    return <p>Age data is not available for this variant.</p>
  }

  const binEdges = variant.age_distribution.het.bin_edges
  const bins = [
    `< ${binEdges[0]}`,
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const values = [
    [
      (includeHeterozygotes ? variant.age_distribution.het.n_smaller : 0) +
        (includeHomozygotes ? variant.age_distribution.hom.n_smaller : 0),
    ],
    ...[...Array(variant.age_distribution.het.bin_freq.length)].map((_, i) => [
      (includeHeterozygotes ? variant.age_distribution.het.bin_freq[i] : 0) +
        (includeHomozygotes ? variant.age_distribution.hom.bin_freq[i] : 0),
    ]),
    [
      (includeHeterozygotes ? variant.age_distribution.het.n_larger : 0) +
        (includeHomozygotes ? variant.age_distribution.hom.n_larger : 0),
    ],
  ]

  return (
    <div>
      <StackedHistogram
        id="age-distribution-plot"
        bins={bins}
        values={values}
        xLabel="Age"
        yLabel="Variant carriers"
        barColors={['#73ab3d']}
        formatTooltip={(bin, variantCarriersInBin) => {
          const nVariantCarriers = sum(variantCarriersInBin)
          return `${nVariantCarriers.toLocaleString()} variant carrier${
            nVariantCarriers !== 1 ? 's' : ''
          } are in the ${bin} age range`
        }}
      />

      <ControlSection>
        <CheckboxWrapper>
          <Checkbox
            checked={includeHeterozygotes}
            id="sv-age-distribution-include-heterozygotes"
            label="Include heterozygous variant carriers"
            onChange={setIncludeHeterozygotes}
          />
          <Checkbox
            checked={includeHomozygotes}
            id="sv-age-distribution-include-homozygotes"
            label="Include homozygous variant carriers"
            onChange={setIncludeHomozygotes}
          />
        </CheckboxWrapper>
      </ControlSection>
    </div>
  )
}

StructuralVariantAgeDistribution.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantAgeDistribution
