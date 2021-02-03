import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import overallAgeDistribution from '../dataset-constants/gnomad_sv_r2_1/ageDistribution.json'
import Legend, { StripedSwatch } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import ControlSection from '../VariantPage/ControlSection'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
`

const CheckboxWrapper = styled.div`
  label {
    display: block;
    line-height: 1.5;
  }
`

const StructuralVariantAgeDistribution = ({ variant }) => {
  const [includeHeterozygotes, setIncludeHeterozygotes] = useState(true)
  const [includeHomozygotes, setIncludeHomozygotes] = useState(true)

  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

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

  const secondaryValues = [
    [overallAgeDistribution.n_smaller],
    ...overallAgeDistribution.bin_freq.map(n => [n]),
    [overallAgeDistribution.n_larger],
  ]

  const series = [{ label: 'Variant carriers', color: '#73ab3d' }]
  if (showAllIndividuals) {
    series.push({
      label: 'All individuals',
      swatch: <StripedSwatch id="age-distribution-legend-swatch" color="#73ab3d" />,
    })
  }

  return (
    <div>
      <LegendWrapper>
        <Legend series={series} />
      </LegendWrapper>

      <StackedHistogram
        id="age-distribution-plot"
        bins={bins}
        values={values}
        secondaryValues={showAllIndividuals ? secondaryValues : null}
        xLabel="Age"
        yLabel="Variant carriers"
        secondaryYLabel="All individuals"
        barColors={['#73ab3d']}
        formatTooltip={(bin, variantCarriersInBin, allIndividualsInBin) => {
          const nVariantCarriers = sum(variantCarriersInBin)
          let tooltipText = `${nVariantCarriers.toLocaleString()} variant carrier${
            nVariantCarriers !== 1 ? 's' : ''
          }`
          if (showAllIndividuals && allIndividualsInBin) {
            const nTotalIndividuals = sum(allIndividualsInBin)
            tooltipText += ` and ${nTotalIndividuals.toLocaleString()} total individual${
              nTotalIndividuals !== 1 ? 's' : ''
            }`
          }
          tooltipText += ` are in the ${bin} age range`
          return tooltipText
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
          <Checkbox
            checked={showAllIndividuals}
            id="age-distribution-show-all-individuals"
            label="Compare to all individuals"
            onChange={setShowAllIndividuals}
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
