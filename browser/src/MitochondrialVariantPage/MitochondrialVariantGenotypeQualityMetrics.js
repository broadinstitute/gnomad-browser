import React, { useState } from 'react'

import { SegmentedControl, Select } from '@gnomad/ui'

import Histogram from '../Histogram'
import Link from '../Link'
import ControlSection from '../VariantPage/ControlSection'
import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const MitochondrialVariantGenotypeQualityMetrics = ({ variant }) => {
  const [selectedMetricOrFilter, setSelectedMetricOrFilter] = useState('Depth')
  const [selectedSamples, setSelectedSamples] = useState('alt')

  const isMetricSelected = selectedMetricOrFilter === 'Depth'

  let histogram
  if (isMetricSelected) {
    const metric = variant.genotype_quality_metrics.find(
      ({ name }) => name === selectedMetricOrFilter
    )
    histogram = metric[selectedSamples]
  } else {
    const filter = variant.genotype_quality_filters.find(
      ({ name }) => name === selectedMetricOrFilter
    )
    histogram = filter.filtered
  }

  return (
    <div>
      <Histogram
        barColor="#73ab3d"
        binEdges={histogram.bin_edges}
        binValues={histogram.bin_freq}
        nLarger={histogram.n_larger}
        xLabel={isMetricSelected ? selectedMetricOrFilter : 'Heteroplasmy Level'}
        yLabel={isMetricSelected ? 'Individuals' : 'Individuals Failing Filter'}
        formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
      />

      <ControlSection>
        <Select
          id="genotype-quality-metrics-metric-or-filter"
          onChange={e => {
            setSelectedMetricOrFilter(e.target.value)
          }}
          value={selectedMetricOrFilter}
        >
          <optgroup label="Quality Metrics">
            {variant.genotype_quality_metrics.map(metric => (
              <option key={metric.name} value={metric.name}>
                {metric.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Quality Filters (Individuals Failing Filter)">
            {variant.genotype_quality_filters.map(filter => {
              const totalFailedFilter = filter.filtered.bin_freq.reduce((acc, n) => acc + n, 0)
              return (
                <option key={filter.name} value={filter.name}>
                  {filter.name} ({totalFailedFilter})
                </option>
              )
            })}
          </optgroup>
        </Select>

        {isMetricSelected && (
          <SegmentedControl
            id="genotype-quality-metrics-samples"
            onChange={setSelectedSamples}
            options={[
              { label: 'Variant Carriers', value: 'alt' },
              { label: 'All Individuals', value: 'all' },
            ]}
            value={selectedSamples}
          />
        )}
      </ControlSection>

      <p>
        Note: This plot may include low-quality genotypes that were excluded from allele counts in
        the tables above.{' '}
        <Link
          to={{
            pathname: '/faq',
            hash: '#what-are-the-meanings-of-the-mitochondrial-specific-filters-and-flags',
          }}
        >
          See the FAQ for details.
        </Link>
      </p>
    </div>
  )
}

MitochondrialVariantGenotypeQualityMetrics.propTypes = {
  variant: MitochondrialVariantDetailPropType.isRequired,
}

export default MitochondrialVariantGenotypeQualityMetrics
