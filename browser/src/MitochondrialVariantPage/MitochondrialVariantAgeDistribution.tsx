import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import { MitochondrialVariant } from './MitochondrialVariantPage'
import overallAgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v3-mitochondria/gnomadV3MitochondrialVariantAgeDistribution.json'

import Legend, { StripedSwatch, SeriesLegendProps } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import ControlSection from '../VariantPage/ControlSection'

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

type Props = {
  variant: MitochondrialVariant
}

const MitochondrialVariantAgeDistribution = ({ variant }: Props) => {
  const [includeHeteroplasmic, setIncludeHeteroplasmic] = useState(true)
  const [includeHomoplasmic, setIncludeHomoplasmic] = useState(true)

  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  const binEdges = overallAgeDistribution.bin_edges
  const bins = [
    `< ${binEdges[0]}`,
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const values = variant.age_distribution
    ? [
        [
          (includeHeteroplasmic ? variant.age_distribution.het.n_smaller : 0) +
            (includeHomoplasmic ? variant.age_distribution.hom.n_smaller : 0),
        ],
        ...[...Array(overallAgeDistribution.bin_freq.length)].map((_, i) => [
          (includeHeteroplasmic ? variant.age_distribution.het.bin_freq[i] : 0) +
            (includeHomoplasmic ? variant.age_distribution.hom.bin_freq[i] : 0),
        ]),
        [
          (includeHeteroplasmic ? variant.age_distribution.het.n_larger : 0) +
            (includeHomoplasmic ? variant.age_distribution.hom.n_larger : 0),
        ],
      ]
    : []

  const secondaryValues = [
    [overallAgeDistribution.n_smaller],
    ...overallAgeDistribution.bin_freq.map((n: any) => [n]),
    [overallAgeDistribution.n_larger],
  ]

  const series: SeriesLegendProps[] = [{ label: 'Variant carriers', color: '#73ab3d' }]
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
        // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: number... Remove this comment to see the full error message
        id="age-distribution-plot"
        bins={bins}
        values={values}
        secondaryValues={showAllIndividuals ? secondaryValues : null}
        xLabel="Age"
        yLabel="Variant carriers"
        secondaryYLabel="All individuals"
        barColors={['#73ab3d']}
        formatTooltip={(bin: any, variantCarriersInBin: any, allIndividualsInBin: any) => {
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
            checked={includeHeteroplasmic}
            id="age-distribution-include-heteroplasmic"
            label="Include heteroplasmic variant carriers"
            onChange={setIncludeHeteroplasmic}
          />
          <Checkbox
            checked={includeHomoplasmic}
            id="age-distribution-include-homoplasmic"
            label="Include homoplasmic variant carriers"
            onChange={setIncludeHomoplasmic}
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

export default MitochondrialVariantAgeDistribution
