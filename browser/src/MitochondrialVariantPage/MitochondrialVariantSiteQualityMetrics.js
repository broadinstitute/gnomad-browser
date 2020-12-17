import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Select } from '@gnomad/ui'

import gnomadV3MitochondrialVariantSiteQualityMetricDistributions from '../dataset-constants/gnomad-v3-mitochondria/gnomadV3MitochondrialVariantSiteQualityMetricDistributions.json'
import ControlSection from '../VariantPage/ControlSection'
import { BarGraph } from '../VariantPage/BarGraph'
import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

const MitochondrialVariantSiteQualityMetrics = ({ datasetId, variant }) => {
  const [selectedMetric, setSelectedMetric] = useState('Mean Depth')

  const selectedMetricValue = variant.site_quality_metrics.find(
    ({ name }) => name === selectedMetric
  ).value

  let selectedMetricHistogram
  if (datasetId === 'gnomad_r3') {
    selectedMetricHistogram =
      gnomadV3MitochondrialVariantSiteQualityMetricDistributions[selectedMetric]
  } else {
    return <p>No site quality metric distributions available for selected dataset.</p>
  }

  const bins = selectedMetricHistogram.bin_freq.map((n, i) => ({
    x0: selectedMetricHistogram.bin_edges[i],
    x1: selectedMetricHistogram.bin_edges[i + 1],
    n,
  }))

  return (
    <div>
      <BarGraph
        barColor="#73ab3d"
        bins={bins}
        highlightValue={
          selectedMetricValue === null
            ? undefined
            : Math.min(selectedMetricValue, bins[bins.length - 1].x1)
        }
        xLabel={selectedMetric}
        yLabel="Variants"
        formatTooltip={bin => `${bin.x0}-${bin.x1}: ${bin.n.toLocaleString()} variants`}
      />

      <ControlSection>
        <Select
          onChange={e => {
            setSelectedMetric(e.target.value)
          }}
          value={selectedMetric}
        >
          {variant.site_quality_metrics.map(metric => (
            <option key={metric.name} value={metric.name}>
              {metric.name} (
              {metric.value === null ? '–' : metric.value.toPrecision(4).replace(/\.0+$/, '')})
            </option>
          ))}
        </Select>
      </ControlSection>
    </div>
  )
}

MitochondrialVariantSiteQualityMetrics.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: MitochondrialVariantDetailPropType.isRequired,
}

export default MitochondrialVariantSiteQualityMetrics
