import { sum } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Select, Tabs } from '@gnomad/ui'

import {
  DatasetId,
  metricsIncludeLowQualityGenotypes,
  hasAlleleBalance,
} from '@gnomad/dataset-metadata/metadata'
import Legend, { StripedSwatch } from '../Legend'
import Link from '../Link'
import StackedHistogram from '../StackedHistogram'
import ControlSection from './ControlSection'
import { Variant, VariantQualityMetrics } from './VariantPage'

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
  datasetId: DatasetId
  variant: Variant
}

interface Tab {
  id: string;
  label: string;
  render: () => JSX.Element;
}

const createTab = (
  showAllIndividuals: Boolean,
  binEdges: any,
  includeExomes: Boolean,
  includeGenomes: Boolean,
  variant: Variant,
  id: string,
  label: string,
  xLabel: string,
  yLabel: string,
  secondaryYLabel?: string,
  legendSwatchId?: string,
): Tab => {
  return {
    id,
    label,
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
                  swatch: <StripedSwatch id={legendSwatchId} color="#999" />,
                },
              ]}
            />
          )}
        </LegendWrapper>

        <StackedHistogram
          id={`variant-${id}-plot`}
          bins={[
            ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
            `> ${binEdges[binEdges.length - 1]}`,
          ]}
          values={prepareData({
            includeExomes,
            includeGenomes,
            includeLargerBin: true,
            samples: 'alt',
            selectedMetric: id,
            variant,
          })}
          secondaryValues={
            showAllIndividuals && id != 'allele_balance'
              ? prepareData({
                  includeExomes,
                  includeGenomes,
                  includeLargerBin: true,
                  samples: 'all',
                  selectedMetric: id,
                  variant,
                })
              : null
          }
          xLabel={xLabel}
          yLabel={yLabel}
          secondaryYLabel={secondaryYLabel}
          barColors={['#428bca', '#73ab3d']}
          formatTooltip={(bin: any, variantCarriersInBin: any, allIndividualsInBin: any) => {
            const nVariantCarriers = sum(variantCarriersInBin);

            if (id == 'allele_balance') {
              return `${nVariantCarriers.toLocaleString()} heterozygous variant carrier${
                nVariantCarriers !== 1 ? 's have' : ' has'
              } an allele balance in the ${bin} range`
            } else {
              let tooltipText = `${nVariantCarriers.toLocaleString()} variant carrier${
                nVariantCarriers !== 1 ? 's' : ''
              }`;

              if (showAllIndividuals) {
                const nTotalIndividuals = sum(allIndividualsInBin);
                tooltipText += ` and ${nTotalIndividuals.toLocaleString()} total individual${
                  nTotalIndividuals !== 1 ? 's' : ''
                }`;
              }
  
              tooltipText += ` ${
                nVariantCarriers === 1 && !showAllIndividuals ? 'has' : 'have'
              } ${xLabel.toLowerCase()} in the ${bin} range`;
  
              return tooltipText;
            }}
          }
        />
      </>
    ),
  };
};

type QualityMetricKey = keyof Omit<VariantQualityMetrics, 'site_quality_metrics'>

const VariantGenotypeQualityMetrics = ({
  datasetId,
  variant,
}: VariantGenotypeQualityMetricsProps) => {
  const [selectedMetric, setSelectedMetric] = useState<QualityMetricKey>('genotype_quality')

  const [showAllIndividuals, setShowAllIndividuals] = useState(true)

  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  ) // 'eg', 'e', 'g'

  const includeExomes = selectedSequencingType.includes('e')
  const includeGenomes = selectedSequencingType.includes('g')

  const hasQualityMetric =
    (variant.exome &&
      variant.exome.quality_metrics &&
      variant.exome.quality_metrics[selectedMetric] &&
      variant.exome.quality_metrics[selectedMetric].alt) ||
    (variant.genome &&
      variant.genome.quality_metrics &&
      variant.genome.quality_metrics[selectedMetric] &&
      variant.genome.quality_metrics[selectedMetric].alt)

  if (!hasQualityMetric) {
    return (
      <>
        Genotype quality metrics not available for this variant. Variants added due to{' '}
        <Link
          preserveSelectedDataset={false}
          to="/news/2023-11-gnomad-v4-0/#hgdp1kg-genetic-ancestry-group-updates--subset-frequencies"
        >
          updates to the HGDP and 1KG subset
        </Link>{' '}
        do not have quality metrics available.
      </>
    )
  }

  // @ts-ignore
  const binEdges = (variant.exome || variant.genome).quality_metrics[selectedMetric].alt.bin_edges
  
  const tabs: Tab[] = [
    createTab(
      showAllIndividuals,
      binEdges,
      includeExomes,
      includeGenomes,
      variant,
      'genotype_quality',
      'Genotype quality',
      'Genotype quality',
      'Variant carriers',
      'All individuals',
      'genotype-quality-legend-swatch',
    ),
    createTab(
      showAllIndividuals,
      binEdges,
      includeExomes,
      includeGenomes,
      variant,
      'genotype_depth',
      'Depth',
      'Depth',
      'Variant carriers',
      'All individuals',
      'depth-legend-swatch',
    )
  ];

  if (hasAlleleBalance(datasetId)) {
    tabs.push(
      createTab(
        showAllIndividuals,
        binEdges,
        includeExomes,
        includeGenomes,
        variant,
        'allele_balance',
        'Allele balance for heterozygotes',
        'Allele balance',
        'Heterozygous variant carriers',
      ) // No secondaryYLabel or legendSwatchId
    )
  };

  return (
    <div>
      <Tabs activeTabId={selectedMetric} tabs={tabs} onChange={setSelectedMetric as any} />

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

      {metricsIncludeLowQualityGenotypes(datasetId) && (
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
const GenotypeQualityMetricPropType: PropTypes.Requireable<GenotypeQualityMetricPropType> =
  PropTypes.shape({
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

export default VariantGenotypeQualityMetrics
