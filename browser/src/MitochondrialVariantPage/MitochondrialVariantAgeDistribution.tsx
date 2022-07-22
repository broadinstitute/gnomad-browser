import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import overallAgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v3-mitochondria/gnomadV3MitochondrialVariantAgeDistribution.json'

import Legend, { StripedSwatch } from '../Legend'
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
  variant: {
    age_distribution?: {
      het: {
        bin_edges: number[]
        bin_freq: number[]
        n_smaller?: number
        n_larger?: number
      }
      hom: {
        bin_edges: number[]
        bin_freq: number[]
        n_smaller?: number
        n_larger?: number
      }
    }
  }
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

  const values = [
    [
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      (includeHeteroplasmic ? variant.age_distribution.het.n_smaller : 0) +
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        (includeHomoplasmic ? variant.age_distribution.hom.n_smaller : 0),
    ],
    ...[...Array(overallAgeDistribution.bin_freq.length)].map((_, i) => [
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      (includeHeteroplasmic ? variant.age_distribution.het.bin_freq[i] : 0) +
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        (includeHomoplasmic ? variant.age_distribution.hom.bin_freq[i] : 0),
    ]),
    [
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      (includeHeteroplasmic ? variant.age_distribution.het.n_larger : 0) +
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        (includeHomoplasmic ? variant.age_distribution.hom.n_larger : 0),
    ],
  ]

  const secondaryValues = [
    [overallAgeDistribution.n_smaller],
    ...overallAgeDistribution.bin_freq.map((n: any) => [n]),
    [overallAgeDistribution.n_larger],
  ]

  const series = [{ label: 'Variant carriers', color: '#73ab3d' }]
  if (showAllIndividuals) {
    series.push({
      label: 'All individuals',
      // @ts-expect-error TS(2345) FIXME: Argument of type '{ label: string; swatch: JSX.Ele... Remove this comment to see the full error message
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
