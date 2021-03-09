import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Select, Tabs } from '@gnomad/ui'

import Legend, { StripedSwatch } from '../Legend'
import Link from '../Link'
import StackedHistogram from '../StackedHistogram'
import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
  margin-bottom: 1em;
`

const MitochondrialVariantGenotypeDepth = ({ variant }) => {
  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  const series = [{ label: 'Variant carriers', color: '#73ab3d' }]
  if (showAllIndividuals) {
    series.push({
      label: 'All individuals',
      swatch: <StripedSwatch id="depth-legend-swatch" color="#73ab3d" />,
    })
  }

  const metric = variant.genotype_quality_metrics.find(({ name }) => name === 'Depth')

  const binEdges = metric.alt.bin_edges
  const bins = [
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const values = [...metric.alt.bin_freq.map(n => [n]), [metric.alt.n_larger]]
  const secondaryValues = [...metric.all.bin_freq.map(n => [n]), [metric.all.n_larger]]

  return (
    <>
      <LegendWrapper style={{ marginTop: '1em' }}>
        <Legend series={series} />
      </LegendWrapper>

      <StackedHistogram
        id="variant-depth-plot"
        bins={bins}
        values={values}
        secondaryValues={showAllIndividuals ? secondaryValues : null}
        xLabel="Depth"
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
          } depth in the ${bin} range`

          return tooltipText
        }}
      />

      <div>
        <Checkbox
          checked={showAllIndividuals}
          id="mt-variant-depth-show-all-individuals"
          label="Compare to all individuals"
          onChange={setShowAllIndividuals}
        />
      </div>
    </>
  )
}

MitochondrialVariantGenotypeDepth.propTypes = {
  variant: MitochondrialVariantDetailPropType.isRequired,
}

const MitochondrialVariantGenotypeQualityFilters = ({ variant }) => {
  const [selectedFilter, setSelectedFilter] = useState(variant.genotype_quality_filters[0].name)

  const histogram = variant.genotype_quality_filters.find(({ name }) => name === selectedFilter)
    .filtered
  const binEdges = histogram.bin_edges
  const bins = [...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`)
  const values = histogram.bin_freq.map(n => [n])

  return (
    <div>
      {/* spacer to align plots on tabs */}
      <div style={{ height: '16px', margin: '1em 0' }} />

      <StackedHistogram
        id="mt-genotype-filter-plot"
        bins={bins}
        values={values}
        xLabel="Heteroplasmy level"
        yLabel="Individuals failing filter"
        barColors={['#73ab3d']}
        formatTooltip={(bin, individualsInBin) => {
          const nIndividuals = sum(individualsInBin)
          return `${nIndividuals.toLocaleString()} individuals${
            nIndividuals === 1 ? 's' : ''
          } with a heteroplasmy level in the ${bin} range failed the ${selectedFilter} filter`
        }}
      />

      <div>
        <label htmlFor="mt-genotype-quality-filter">
          Filter:{' '}
          <Select
            id="mt-genotype-quality-filter"
            onChange={e => {
              setSelectedFilter(e.target.value)
            }}
            value={selectedFilter}
          >
            {variant.genotype_quality_filters.map(filter => {
              const totalFailedFilter = filter.filtered.bin_freq.reduce((acc, n) => acc + n, 0)
              return (
                <option key={filter.name} value={filter.name}>
                  {filter.name} ({totalFailedFilter} individuals failing)
                </option>
              )
            })}
          </Select>
        </label>
      </div>

      <p>
        Note: This plot may include low-quality genotypes that were excluded from allele counts in
        the tables above.{' '}
        <Link to="/help/what-are-the-meanings-of-the-mitochondrial-specific-filters-and-flags">
          More information.
        </Link>
      </p>
    </div>
  )
}

MitochondrialVariantGenotypeQualityFilters.propTypes = {
  variant: MitochondrialVariantDetailPropType.isRequired,
}

const MitochondrialVariantGenotypeQualityMetrics = ({ variant }) => {
  const [selectedTab, setSelectedTab] = useState('depth') // 'depth' or 'filter'
  return (
    <Tabs
      activeTabId={selectedTab}
      onChange={setSelectedTab}
      tabs={[
        {
          id: 'depth',
          label: 'Depth',
          render: () => <MitochondrialVariantGenotypeDepth variant={variant} />,
        },
        {
          id: 'filters',
          label: 'Filters',
          render: () => <MitochondrialVariantGenotypeQualityFilters variant={variant} />,
        },
      ]}
    />
  )
}

MitochondrialVariantGenotypeQualityMetrics.propTypes = {
  variant: MitochondrialVariantDetailPropType.isRequired,
}

export default MitochondrialVariantGenotypeQualityMetrics
