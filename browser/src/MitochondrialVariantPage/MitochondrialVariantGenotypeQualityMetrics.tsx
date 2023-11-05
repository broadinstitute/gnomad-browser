import { sum } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Select, Tabs } from '@gnomad/ui'

import Legend, { StripedSwatch, SeriesLegendProps } from '../Legend'
import Link from '../Link'
import StackedHistogram from '../StackedHistogram'
import { MitochondrialVariant, GenotypeQualityFilter } from './MitochondrialVariantPage'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
  margin-bottom: 1em;
`

type MitochondrialVariantGenotypeDepthProps = {
  variant: MitochondrialVariant
}

const MitochondrialVariantGenotypeDepth = ({ variant }: MitochondrialVariantGenotypeDepthProps) => {
  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  const series: SeriesLegendProps[] = [{ label: 'Variant carriers', color: '#73ab3d' }]
  if (showAllIndividuals) {
    series.push({
      label: 'All individuals',
      swatch: <StripedSwatch id="depth-legend-swatch" color="#73ab3d" />,
    })
  }

  const metric = variant.genotype_quality_metrics.find(({ name }) => name === 'Depth')
  if (metric && metric.alt !== null && metric.all !== null) {
    const binEdges = metric.alt.bin_edges
    const bins = [
      ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
      `> ${binEdges[binEdges.length - 1]}`,
    ]

    const values = [...metric.alt.bin_freq.map((n: any) => [n]), [metric.alt.n_larger]]
    const secondaryValues = [...metric.all.bin_freq.map((n: any) => [n]), [metric.all.n_larger]]

    return (
      <>
        <LegendWrapper style={{ marginTop: '1em' }}>
          <Legend series={series} />
        </LegendWrapper>

        <StackedHistogram
          // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: any[];... Remove this comment to see the full error message
          id="variant-depth-plot"
          bins={bins}
          values={values}
          secondaryValues={showAllIndividuals ? secondaryValues : null}
          xLabel="Depth"
          yLabel="Variant carriers"
          secondaryYLabel="All individuals"
          barColors={['#73ab3d']}
          formatTooltip={(bin: any, variantCarriersInBin: any, allIndividualsInBin: any) => {
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
  return null
}

type MitochondrialVariantGenotypeQualityFiltersProps = {
  variant: MitochondrialVariant
}

const FilterOptions = ({ filters }: { filters: GenotypeQualityFilter[] }) => (
  <>
    {filters.map((filter) => {
      const totalFailedFilter = filter.filtered
        ? filter.filtered.bin_freq.reduce((acc: any, n: any) => acc + n, 0)
        : 0
      return (
        <option key={filter.name} value={filter.name}>
          {filter.name} ({totalFailedFilter} individuals failing)
        </option>
      )
    })}
  </>
)

const MitochondrialVariantGenotypeQualityFilters = ({
  variant,
}: MitochondrialVariantGenotypeQualityFiltersProps) => {
  const [selectedFilter, setSelectedFilter] = useState(variant.genotype_quality_filters[0].name)

  const filter = variant.genotype_quality_filters.find(({ name }) => name === selectedFilter)
  if (filter && filter.filtered !== null) {
    const histogram = filter.filtered
    const binEdges = histogram.bin_edges
    const bins = [...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`)
    const values = histogram.bin_freq.map((n: any) => [n])

    return (
      <div>
        {/* spacer to align plots on tabs */}
        <div style={{ height: '16px', margin: '1em 0' }} />

        <StackedHistogram
          // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: any; x... Remove this comment to see the full error message
          id="mt-genotype-filter-plot"
          bins={bins}
          values={values}
          xLabel="Heteroplasmy level"
          yLabel="Individuals failing filter"
          barColors={['#73ab3d']}
          formatTooltip={(bin: any, individualsInBin: any) => {
            const nIndividuals = sum(individualsInBin)
            return `${nIndividuals.toLocaleString()} individuals${
              nIndividuals === 1 ? 's' : ''
            } with a heteroplasmy level in the ${bin} range failed the ${selectedFilter} filter`
          }}
        />

        <div>
          <label htmlFor="mt-genotype-quality-filter">
            Filter: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <Select
              id="mt-genotype-quality-filter"
              onChange={(e: any) => {
                setSelectedFilter(e.target.value)
              }}
              value={selectedFilter}
            >
              <FilterOptions filters={variant.genotype_quality_filters} />
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
  return null
}

type MitochondrialVariantGenotypeQualityMetricsProps = {
  variant: MitochondrialVariant
}

const MitochondrialVariantGenotypeQualityMetrics = ({
  variant,
}: MitochondrialVariantGenotypeQualityMetricsProps) => {
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

export default MitochondrialVariantGenotypeQualityMetrics
