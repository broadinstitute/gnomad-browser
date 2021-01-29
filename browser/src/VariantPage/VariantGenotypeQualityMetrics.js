import { sum } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import Legend, { StripedSwatch } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import ControlSection from './ControlSection'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
`

const prepareData = ({
  includeExomes,
  includeGenomes,
  includeLargerBin = false,
  samples,
  selectedMetric,
  variant,
}) => {
  const histogram = (variant.exome || variant.genome).quality_metrics[selectedMetric][samples]
  const nBins = histogram.bin_freq.length

  const exomeData =
    includeExomes && variant.exome ? variant.exome.quality_metrics[selectedMetric][samples] : null
  const genomeData =
    includeGenomes && variant.genome
      ? variant.genome.quality_metrics[selectedMetric][samples]
      : null

  const values = [...Array(nBins)].map((_, i) => [
    exomeData ? exomeData.bin_freq[i] : 0,
    genomeData ? genomeData.bin_freq[i] : 0,
  ])

  if (includeLargerBin) {
    values.push([exomeData ? exomeData.n_larger : 0, genomeData ? genomeData.n_larger : 0])
  }

  return values
}

const getDefaultSelectedSequencingType = variant => {
  const hasExome = Boolean(variant.exome)
  const hasGenome = Boolean(variant.genome)

  if (hasExome && hasGenome) {
    return 'eg'
  }
  if (hasExome) {
    return 'e'
  }
  return 'g'
}

const VariantGenotypeQualityMetrics = ({ datasetId, variant }) => {
  const [selectedMetric, setSelectedMetric] = useState('genotype_quality') // 'genotype_quality', 'genotype_depth', or 'allele_balance'
  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  ) // 'eg', 'e', 'g'

  const includeExomes = selectedSequencingType.includes('e')
  const includeGenomes = selectedSequencingType.includes('g')

  const binEdges = (variant.exome || variant.genome).quality_metrics[selectedMetric].alt.bin_edges
  const bins = [...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`)

  const metricName = {
    genotype_quality: 'Genotype Quality',
    genotype_depth: 'Depth',
    allele_balance: 'Allele Balance',
  }[selectedMetric]

  let values
  let secondaryValues
  let yLabel
  let formatTooltip
  if (selectedMetric === 'allele_balance') {
    values = prepareData({ includeExomes, includeGenomes, samples: 'alt', selectedMetric, variant })
    yLabel = 'Heterozygous variant carriers'
    formatTooltip = (bin, variantCarriersInBin) => {
      const nVariantCarriers = sum(variantCarriersInBin)
      return `${nVariantCarriers.toLocaleString()} heterozygous variant carrier${
        nVariantCarriers !== 1 ? 's' : ''
      } have an allele balance in the ${bin} range`
    }
  } else {
    bins.push(`> ${binEdges[binEdges.length - 1]}`)
    values = prepareData({
      includeExomes,
      includeGenomes,
      includeLargerBin: true,
      samples: 'alt',
      selectedMetric,
      variant,
    })
    secondaryValues = prepareData({
      includeExomes,
      includeGenomes,
      includeLargerBin: true,
      samples: 'all',
      selectedMetric,
      variant,
    })
    yLabel = 'Variant carriers'
    formatTooltip = (bin, variantCarriersInBin, allIndividualsInBin) => {
      const nVariantCarriers = sum(variantCarriersInBin)
      const nTotalIndividuals = sum(allIndividualsInBin)
      return `${nVariantCarriers.toLocaleString()} variant carrier${
        nVariantCarriers !== 1 ? 's' : ''
      } and ${nTotalIndividuals.toLocaleString()} total individual${
        nTotalIndividuals ? 's' : ''
      } have a ${metricName.toLowerCase()} in the ${bin} range`
    }
  }

  return (
    <div>
      <LegendWrapper>
        <Legend
          series={[
            { label: 'Exome', color: '#428bca' },
            { label: 'Genome', color: '#73ab3d' },
          ]}
        />
        {selectedMetric !== 'allele_balance' && (
          <Legend
            series={[
              { label: 'Variant carriers', color: '#999' },
              {
                label: 'All individuals',
                swatch: <StripedSwatch id="genotype-quality-metrics-legend-swatch" color="#999" />,
              },
            ]}
          />
        )}
      </LegendWrapper>

      <StackedHistogram
        id="variant-genotype-quality-metrics-plot"
        bins={bins}
        values={values}
        secondaryValues={secondaryValues}
        xLabel={metricName}
        yLabel={yLabel}
        secondaryYLabel="All individuals"
        barColors={['#428bca', '#73ab3d']}
        formatTooltip={formatTooltip}
      />

      <ControlSection>
        <label htmlFor="genotype-quality-metrics-metric">
          Metric:{' '}
          <Select
            id="genotype-quality-metrics-metric"
            onChange={e => {
              setSelectedMetric(e.target.value)
            }}
            value={selectedMetric}
            style={{
              width: selectedMetric === 'allele_balance' ? 'auto' : '150px',
            }}
          >
            <option value="genotype_quality">Genotype quality</option>
            <option value="genotype_depth">Depth</option>
            {datasetId !== 'exac' && (
              <option value="allele_balance">Allele balance for heterozygotes</option>
            )}
          </Select>
        </label>

        <label htmlFor="genotype-quality-metrics-sequencing-type">
          Sequencing types:{' '}
          <Select
            id="genotype-quality-metrics-sequencing-type"
            disabled={!variant.exome || !variant.genome}
            onChange={e => {
              setSelectedSequencingType(e.target.value)
            }}
            value={selectedSequencingType}
          >
            <option value="eg">Exome and Genome</option>
            <option value="e">Exome</option>
            <option value="g">Genome</option>
          </Select>
        </label>
      </ControlSection>

      {(datasetId.startsWith('gnomad_r2') || datasetId === 'exac') && (
        <p>
          Note: This plot may include low-quality genotypes that were excluded from allele counts in
          the tables above.
        </p>
      )}
    </div>
  )
}

const HistogramPropType = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number,
  n_larger: PropTypes.number,
})

const GenotypeQualityMetricPropType = PropTypes.shape({
  allele_balance: PropTypes.shape({
    alt: HistogramPropType,
  }),
  genotype_depth: PropTypes.shape({
    all: HistogramPropType,
    alt: HistogramPropType,
  }).isRequired,
  genotype_quality: PropTypes.shape({
    all: HistogramPropType,
    alt: HistogramPropType,
  }).isRequired,
})

VariantGenotypeQualityMetrics.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      quality_metrics: GenotypeQualityMetricPropType.isRequired,
    }),
    genome: PropTypes.shape({
      quality_metrics: GenotypeQualityMetricPropType.isRequired,
    }),
  }).isRequired,
}

export default VariantGenotypeQualityMetrics
