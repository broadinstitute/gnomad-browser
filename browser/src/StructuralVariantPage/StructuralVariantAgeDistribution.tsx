import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import overallAgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-sv-v2/ageDistribution.json'

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

type Props = {
  variant: StructuralVariantDetailPropType
}

const StructuralVariantAgeDistribution = ({ variant }: Props) => {
  const [includeHeterozygotes, setIncludeHeterozygotes] = useState(true)
  const [includeHomozygotes, setIncludeHomozygotes] = useState(true)

  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  // Only show histogram if there is data to show
  const isAgeDataAvailable = [
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    ...variant.age_distribution.het.bin_freq,
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    variant.age_distribution.het.n_smaller,
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    variant.age_distribution.het.n_larger,
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    ...variant.age_distribution.hom.bin_freq,
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    variant.age_distribution.hom.n_smaller,
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    variant.age_distribution.hom.n_larger,
  ].some((n) => n !== 0)

  if (!isAgeDataAvailable) {
    return <p>Age data is not available for this variant.</p>
  }

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const binEdges = variant.age_distribution.het.bin_edges
  const bins = [
    `< ${binEdges[0]}`,
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const values = [
    [
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      (includeHeterozygotes ? variant.age_distribution.het.n_smaller : 0) +
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        (includeHomozygotes ? variant.age_distribution.hom.n_smaller : 0),
    ],
    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
    ...[...Array(variant.age_distribution.het.bin_freq.length)].map((_, i) => [
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      (includeHeterozygotes ? variant.age_distribution.het.bin_freq[i] : 0) +
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        (includeHomozygotes ? variant.age_distribution.hom.bin_freq[i] : 0),
    ]),
    [
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      (includeHeterozygotes ? variant.age_distribution.het.n_larger : 0) +
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        (includeHomozygotes ? variant.age_distribution.hom.n_larger : 0),
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

export default StructuralVariantAgeDistribution
