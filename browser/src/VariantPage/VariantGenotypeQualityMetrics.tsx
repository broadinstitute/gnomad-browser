import { sum } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Select, Tabs } from '@gnomad/ui'

import Legend, { StripedSwatch } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import ControlSection from './ControlSection'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
  margin-bottom: 1em;
`

const prepareData = ({
  includeExomes,
  includeGenomes,
  includeLargerBin = false,
  samples,
  selectedMetric,
  variant,
}: any) => {
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

const getDefaultSelectedSequencingType = (variant: any) => {
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

type VariantGenotypeQualityMetricsProps = {
  datasetId: string
  variant: {
    exome?: {
      quality_metrics: GenotypeQualityMetricPropType
    }
    genome?: {
      quality_metrics: GenotypeQualityMetricPropType
    }
  }
}

const VariantGenotypeQualityMetrics = ({
  datasetId,
  variant,
}: VariantGenotypeQualityMetricsProps) => {
  const [selectedMetric, setSelectedMetric] = useState('genotype_quality') // 'genotype_quality', 'genotype_depth', or 'allele_balance'

  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  ) // 'eg', 'e', 'g'

  const includeExomes = selectedSequencingType.includes('e')
  const includeGenomes = selectedSequencingType.includes('g')

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const binEdges = (variant.exome || variant.genome).quality_metrics[selectedMetric].alt.bin_edges

  const tabs = [
    {
      id: 'genotype_quality',
      label: 'Genotype quality',
      render: () => (
        <>
          <LegendWrapper>
            <Legend
              series={[
                { label: 'Exome', color: '#428bca' },
                { label: 'Genome', color: '#73ab3d' },
              ]}
            />
            {showAllIndividuals && (
              <Legend
                series={[
                  { label: 'Variant carriers', color: '#999' },
                  {
                    label: 'All individuals',
                    swatch: <StripedSwatch id="genotype-quality-legend-swatch" color="#999" />,
                  },
                ]}
              />
            )}
          </LegendWrapper>

          <StackedHistogram
            // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: any[][... Remove this comment to see the full error message
            id="variant-genotype-quality-plot"
            bins={[
              ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
              `> ${binEdges[binEdges.length - 1]}`,
            ]}
            values={prepareData({
              includeExomes,
              includeGenomes,
              includeLargerBin: true,
              samples: 'alt',
              selectedMetric: 'genotype_quality',
              variant,
            })}
            secondaryValues={
              showAllIndividuals
                ? prepareData({
                    includeExomes,
                    includeGenomes,
                    includeLargerBin: true,
                    samples: 'all',
                    selectedMetric: 'genotype_quality',
                    variant,
                  })
                : null
            }
            xLabel="Genotype quality"
            yLabel="Variant carriers"
            secondaryYLabel="All individuals"
            barColors={['#428bca', '#73ab3d']}
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
              } genotype quality in the ${bin} range`

              return tooltipText
            }}
          />
        </>
      ),
    },
    {
      id: 'genotype_depth',
      label: 'Depth',
      render: () => (
        <>
          <LegendWrapper style={{ marginTop: '1em' }}>
            <Legend
              series={[
                { label: 'Exome', color: '#428bca' },
                { label: 'Genome', color: '#73ab3d' },
              ]}
            />
            {showAllIndividuals && (
              <Legend
                series={[
                  { label: 'Variant carriers', color: '#999' },
                  {
                    label: 'All individuals',
                    swatch: <StripedSwatch id="depth-legend-swatch" color="#999" />,
                  },
                ]}
              />
            )}
          </LegendWrapper>

          <StackedHistogram
            // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: any[][... Remove this comment to see the full error message
            id="variant-depth-plot"
            bins={[
              ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
              `> ${binEdges[binEdges.length - 1]}`,
            ]}
            values={prepareData({
              includeExomes,
              includeGenomes,
              includeLargerBin: true,
              samples: 'alt',
              selectedMetric: 'genotype_depth',
              variant,
            })}
            secondaryValues={
              showAllIndividuals
                ? prepareData({
                    includeExomes,
                    includeGenomes,
                    includeLargerBin: true,
                    samples: 'all',
                    selectedMetric: 'genotype_depth',
                    variant,
                  })
                : null
            }
            xLabel="Depth"
            yLabel="Variant carriers"
            secondaryYLabel="All individuals"
            barColors={['#428bca', '#73ab3d']}
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
        </>
      ),
    },
  ]

  if (datasetId !== 'exac') {
    tabs.push({
      id: 'allele_balance',
      label: 'Allele balance for heterozygotes',
      render: () => (
        <>
          <LegendWrapper style={{ marginTop: '1em' }}>
            <Legend
              series={[
                { label: 'Exome', color: '#428bca' },
                { label: 'Genome', color: '#73ab3d' },
              ]}
            />
          </LegendWrapper>
          <StackedHistogram
            // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: any[][... Remove this comment to see the full error message
            id="variant-allele-balance-plot"
            bins={[...Array(binEdges.length - 1)].map(
              (_, i) => `${binEdges[i]}-${binEdges[i + 1]}`
            )}
            values={prepareData({
              includeExomes,
              includeGenomes,
              samples: 'alt',
              selectedMetric: 'allele_balance',
              variant,
            })}
            xLabel="Allele balance"
            yLabel="Heterozygous variant carriers"
            barColors={['#428bca', '#73ab3d']}
            formatTooltip={(bin: any, variantCarriersInBin: any) => {
              const nVariantCarriers = sum(variantCarriersInBin)
              return `${nVariantCarriers.toLocaleString()} heterozygous variant carrier${
                nVariantCarriers !== 1 ? 's have' : ' has'
              } an allele balance in the ${bin} range`
            }}
          />
        </>
      ),
    })
  }

  return (
    <div>
      <Tabs activeTabId={selectedMetric} tabs={tabs} onChange={setSelectedMetric} />

      <ControlSection>
        <Checkbox
          checked={selectedMetric !== 'allele_balance' && showAllIndividuals}
          disabled={selectedMetric === 'allele_balance'}
          id="genotype-quality-metrics-show-all-individuals"
          label="Compare to all individuals"
          onChange={setShowAllIndividuals}
        />

        <label htmlFor="genotype-quality-metrics-sequencing-type">
          Sequencing types: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="genotype-quality-metrics-sequencing-type"
            disabled={!variant.exome || !variant.genome}
            onChange={(e: any) => {
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

type HistogramPropType = {
  bin_edges: number[]
  bin_freq: number[]
  n_smaller?: number
  n_larger?: number
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ bin_edges: Validato... Remove this comment to see the full error message
const HistogramPropType: PropTypes.Requireable<HistogramPropType> = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number,
  n_larger: PropTypes.number,
})

type GenotypeQualityMetricPropType = {
  allele_balance?: {
    alt?: HistogramPropType
  }
  genotype_depth: {
    all?: HistogramPropType
    alt?: HistogramPropType
  }
  genotype_quality: {
    all?: HistogramPropType
    alt?: HistogramPropType
  }
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ allele_balance: Req... Remove this comment to see the full error message
const GenotypeQualityMetricPropType: PropTypes.Requireable<GenotypeQualityMetricPropType> = PropTypes.shape(
  {
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
  }
)

export default VariantGenotypeQualityMetrics
