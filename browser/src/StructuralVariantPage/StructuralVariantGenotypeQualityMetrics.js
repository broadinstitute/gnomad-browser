import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox } from '@gnomad/ui'

import Legend, { StripedSwatch } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
`

const StructuralVariantGenotypeQualityMetrics = ({ variant }) => {
  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  const series = [{ label: 'Variant carriers', color: '#73ab3d' }]
  if (showAllIndividuals) {
    series.push({
      label: 'All individuals',
      swatch: <StripedSwatch id="sv-genotype-quality-legend-swatch" color="#73ab3d" />,
    })
  }

  const binEdges = variant.genotype_quality.alt.bin_edges
  const bins = [
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const values = [
    ...variant.genotype_quality.alt.bin_freq.map(n => [n]),
    [variant.genotype_quality.alt.n_larger],
  ]
  const secondaryValues = [
    ...variant.genotype_quality.all.bin_freq.map(n => [n]),
    [variant.genotype_quality.all.n_larger],
  ]

  return (
    <div>
      <LegendWrapper style={{ marginTop: '1em' }}>
        <Legend series={series} />
      </LegendWrapper>

      <StackedHistogram
        id="sv-genotype-quality"
        bins={bins}
        values={values}
        secondaryValues={showAllIndividuals ? secondaryValues : null}
        xLabel="Genotype quality"
        yLabel="Variant carriers"
        secondaryYLabel="All individuals"
        barColors={['#73ab3d']}
        formatTooltip={(bin, variantCarriersInBin, allIndividualsInBin) => {
          const nVariantCarriers = sum(variantCarriersInBin)
          let tooltipText = `${nVariantCarriers.toLocaleString()} variant carrier${
            nVariantCarriers !== 1 ? 's' : ''
          }`

          if (showAllIndividuals) {
            const nTotalIndividuals = sum(allIndividualsInBin)
            tooltipText += ` and ${nTotalIndividuals.toLocaleString()} total individual${
              nTotalIndividuals !== 1 ? 's' : ''
            }`
          }

          tooltipText += ` ${
            nVariantCarriers === 1 && !showAllIndividuals ? 'has' : 'have'
          } genotype quality in the ${bin} range`

          return tooltipText
        }}
      />

      <div>
        <Checkbox
          checked={showAllIndividuals}
          id="sv-genotype-quality-show-all-individuals"
          label="Compare to all individuals"
          onChange={setShowAllIndividuals}
        />
      </div>
    </div>
  )
}

StructuralVariantGenotypeQualityMetrics.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantGenotypeQualityMetrics
