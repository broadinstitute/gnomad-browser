import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft, AxisRight } from '@vx/axis'

import { BaseTable, Select, Tabs, TooltipAnchor } from '@gnomad/ui'

import exacSiteQualityMetricDistributions from '@gnomad/dataset-metadata/datasets/exac/siteQualityMetricDistributions.json'
import gnomadV2SiteQualityMetricDistributions from '@gnomad/dataset-metadata/datasets/gnomad-v2/siteQualityMetricDistributions.json'
import gnomadV3SiteQualityMetricDistributions from '@gnomad/dataset-metadata/datasets/gnomad-v3/siteQualityMetricDistributions.json'

import Legend from '../Legend'
import ControlSection from './ControlSection'

// ================================================================================================
// Metric descriptions
// ================================================================================================

const qualityMetricDescriptions = {
  BaseQRankSum: 'Z-score from Wilcoxon rank sum test of alternate vs. reference base qualities.',
  ClippingRankSum:
    'Z-score from Wilcoxon rank sum test of alternate vs. reference number of hard clipped bases.',
  DP:
    'Depth of informative coverage for each sample; reads with MQ=255 or with bad mates are filtered.',
  FS: "Phred-scaled p-value of Fisher's exact test for strand bias.",
  InbreedingCoeff:
    'Inbreeding coefficient as estimated from the genotype likelihoods per-sample when compared against the Hardy-Weinberg expectation.',
  MQ: 'Root mean square of the mapping quality of reads across all samples.',
  MQRankSum:
    'Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.',
  pab_max:
    'Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of AB=0.5.',
  QD: 'Variant call confidence normalized by depth of sample reads supporting a variant.',
  ReadPosRankSum:
    'Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.',
  // Info field is `rf_tp_probability`
  RF: 'Random forest prediction probability for a site being a true variant.',
  SiteQuality: undefined, // TODO
  SOR: 'Strand bias estimated by the symmetric odds ratio test.',
  VarDP: 'Depth over variant genotypes (does not include depth of reference samples).',
  VQSLOD:
    'Log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.',
}

const getSiteQualityMetricDescription = datasetId => {
  return datasetId.startsWith('gnomad_r2') || datasetId === 'exac'
    ? 'Phred-scaled quality score for the assertion made in ALT. i.e. −10log10 prob(no variant). High Phred-scaled quality scores indicate high confidence calls.'
    : 'Sum of PL[0] values; used to approximate the Phred-scaled quality score for the assertion made in ALT. i.e. −10log10 prob(no variant). High Phred-scaled quality scores indicate high confidence calls.'
}

// ================================================================================================
// Data munging
// ================================================================================================

const prepareDataGnomadV3 = ({ metric, variant }) => {
  let key
  let description

  const genomeMetricValue = variant.genome.quality_metrics.site_quality_metrics.find(
    m => m.metric === metric
  ).value

  const { ac, an } = variant.genome
  if (metric === 'SiteQuality' || metric === 'AS_QUALapprox') {
    if (ac === 1) {
      key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-binned_singleton`
      description = `${
        metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
      } approximation for all singleton variants.`
    } else if (ac === 2) {
      key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-binned_doubleton`
      description = `${
        metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
      } approximation for all doubleton variants.`
    } else {
      const afBins = [
        { min: 0, max: 0.00005, key: '0.00005' },
        { min: 0.00005, max: 0.0001, key: '0.0001' },
        { min: 0.0001, max: 0.0002, key: '0.0002' },
        { min: 0.0002, max: 0.0005, key: '0.0005' },
        { min: 0.0005, max: 0.001, key: '0.001' },
        { min: 0.001, max: 0.002, key: '0.002' },
        { min: 0.002, max: 0.005, key: '0.005' },
        { min: 0.005, max: 0.01, key: '0.01' },
        { min: 0.01, max: 0.02, key: '0.02' },
        { min: 0.02, max: 0.05, key: '0.05' },
        { min: 0.05, max: 0.1, key: '0.1' },
        { min: 0.1, max: 0.2, key: '0.2' },
        { min: 0.2, max: 0.5, key: '0.5' },
        { min: 0.5, max: Infinity, key: '1' },
      ]
      const af = an === 0 ? 0 : ac / an
      const afBin = afBins.find(bin => bin.min <= af && af < bin.max)
      if (afBin.max === Infinity) {
        description = `${
          metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
        } approximation for all variants with AF >= ${afBin.min}.`
      } else
        description = `${
          metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
        } approximation for all variants with ${afBin.min} <= AF ${afBin.max === 1 ? '<=' : '<'} ${
          afBin.max
        }.`
      key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-binned_${afBin.key}`
    }
  } else if (metric === 'InbreedingCoeff') {
    const af = an === 0 ? 0 : ac / an
    if (af < 0.0005) {
      key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-under_0.0005`
      description = 'InbreedingCoeff for all variants with AF < 0.0005.'
    } else {
      key = 'InbreedingCoeff-over_0.0005'
      description = 'InbreedingCoeff for all variants with AF >= 0.0005.'
    }
  } else {
    key = metric
    if (metric.startsWith('AS_')) {
      const baseDescription = qualityMetricDescriptions[metric.slice(3)]
      if (baseDescription) {
        description = `Allele-specific ${baseDescription
          .charAt(0)
          .toLowerCase()}${baseDescription.slice(1)}`
      }
    } else {
      description = qualityMetricDescriptions[metric]
    }
  }

  const histogram = gnomadV3SiteQualityMetricDistributions.find(m => m.metric === key)
  const binEdges = histogram.bin_edges

  const genomeBinValues = [histogram.n_smaller, ...histogram.bin_freq, histogram.n_larger]

  return { binEdges, genomeBinValues, genomeMetricValue, description }
}

const prepareDataGnomadV2 = ({ metric, variant }) => {
  let binEdges
  let exomeBinValues
  let genomeBinValues
  let exomeMetricValue
  let genomeMetricValue
  let description

  if (variant.exome) {
    exomeMetricValue = variant.exome.quality_metrics.site_quality_metrics.find(
      m => m.metric === metric
    ).value
  }
  if (variant.genome) {
    genomeMetricValue = variant.genome.quality_metrics.site_quality_metrics.find(
      m => m.metric === metric
    ).value
  }

  if (metric === 'SiteQuality') {
    const getAFBin = ({ sequencingType, ac, an }) => {
      let afBinHistogram
      let afBinLabel
      if (ac === 1) {
        afBinHistogram =
          gnomadV2SiteQualityMetricDistributions[sequencingType].siteQuality.singleton
        afBinLabel = `singleton ${sequencingType} variants`
      } else if (ac === 2) {
        afBinHistogram =
          gnomadV2SiteQualityMetricDistributions[sequencingType].siteQuality.doubleton
        afBinLabel = `doubleton ${sequencingType} variants`
      } else {
        const af = an === 0 ? 0 : ac / an
        const afBin = gnomadV2SiteQualityMetricDistributions[
          sequencingType
        ].siteQuality.af_bins.find(
          bin => bin.min_af <= af && (af < bin.max_af || (af === 1 && af <= bin.max_af))
        )
        afBinHistogram = afBin.histogram
        afBinLabel = `${sequencingType} variants with ${afBin.min_af} <= AF ${
          afBin.max_af === 1 ? '<=' : '<'
        } ${afBin.max_af}`
      }
      return { histogram: afBinHistogram, label: afBinLabel }
    }

    const exomeBin = variant.exome
      ? getAFBin({ sequencingType: 'exome', ac: variant.exome.ac, an: variant.exome.an })
      : null
    const genomeBin = variant.genome
      ? getAFBin({ sequencingType: 'genome', ac: variant.genome.ac, an: variant.genome.an })
      : null

    if (process.env.NODE_ENV === 'development' && exomeBin && genomeBin) {
      if (
        !exomeBin.histogram.bin_edges.every(
          (edge, i) => Math.abs(edge - genomeBin.histogram.bin_edges[i]) < 0.001
        )
      ) {
        throw new Error(
          `gnomAD v2 site quality bin edges do not match for ${exomeBin.label} exomes and ${genomeBin.label} genomes`
        )
      }
    }

    const { histogram } = exomeBin || genomeBin
    binEdges = histogram.bin_edges.map(edge => Math.log10(edge))

    exomeBinValues = exomeBin
      ? [exomeBin.histogram.n_smaller, ...exomeBin.histogram.bin_freq, exomeBin.histogram.n_larger]
      : null
    genomeBinValues = genomeBin
      ? [
          genomeBin.histogram.n_smaller,
          ...genomeBin.histogram.bin_freq,
          genomeBin.histogram.n_larger,
        ]
      : null

    if (variant.exome && variant.genome) {
      description = `This is the site quality distribution for all ${exomeBin.label} and all ${genomeBin.label}.`
    } else {
      description = `This is the site quality distribution for all ${
        (exomeBin || genomeBin).label
      }.`
    }
  } else {
    const exomeHistogram = gnomadV2SiteQualityMetricDistributions.exome.otherMetrics.find(
      m => m.metric === metric
    ).histogram
    const genomeHistogram = gnomadV2SiteQualityMetricDistributions.genome.otherMetrics.find(
      m => m.metric === metric
    ).histogram

    if (process.env.NODE_ENV === 'development') {
      if (
        !exomeHistogram.bin_edges.every(
          (edge, i) => Math.abs(edge - genomeHistogram.bin_edges[i]) < 0.001
        )
      ) {
        throw new Error(`gnomAD v2 ${metric} bin edges do not match for exomes and genomes`)
      }
    }

    binEdges =
      metric === 'DP'
        ? exomeHistogram.bin_edges.map(edge => Math.log10(edge))
        : exomeHistogram.bin_edges
    exomeBinValues = [exomeHistogram.n_smaller, ...exomeHistogram.bin_freq, exomeHistogram.n_larger]
    genomeBinValues = [
      genomeHistogram.n_smaller,
      ...genomeHistogram.bin_freq,
      genomeHistogram.n_larger,
    ]

    description = qualityMetricDescriptions[metric]
  }

  return {
    binEdges,
    exomeBinValues,
    genomeBinValues,
    exomeMetricValue,
    genomeMetricValue,
    description,
  }
}

const prepareDataExac = ({ metric, variant }) => {
  const exomeMetricValue = variant.exome.quality_metrics.site_quality_metrics.find(
    m => m.metric === metric
  ).value
  const { ac, an } = variant.exome
  let binEdges
  let histogram
  let description
  if (metric === 'SiteQuality') {
    if (ac === 1) {
      histogram = exacSiteQualityMetricDistributions.exome.siteQuality.singleton
      description = 'This is the site quality distribution for all singleton variants.'
    } else if (ac === 2) {
      histogram = exacSiteQualityMetricDistributions.exome.siteQuality.doubleton
      description = 'This is the site quality distribution for all doubleton variants.'
    } else {
      const af = an === 0 ? 0 : ac / an
      const afBin = exacSiteQualityMetricDistributions.exome.siteQuality.af_bins.find(
        bin => bin.min_af <= af && (af < bin.max_af || (af === 1 && af <= bin.max_af))
      )
      histogram = afBin.histogram
      description = `This is the site quality distribution for all variants with ${
        afBin.min_af
      } <= AF ${afBin.max_af === 1 ? '<=' : '<'} ${afBin.max_af}.`
    }
    binEdges = histogram.bin_edges.map(edge => Math.log10(edge))
  } else {
    histogram = exacSiteQualityMetricDistributions.exome.otherMetrics.find(m => m.metric === metric)
      .histogram
    binEdges =
      metric === 'DP' ? histogram.bin_edges.map(edge => Math.log10(edge)) : histogram.binEdges
    description = qualityMetricDescriptions[metric]
  }

  const exomeBinValues = [0, ...histogram.bin_freq, 0]

  return { binEdges, exomeBinValues, exomeMetricValue, description }
}

const prepareData = ({ datasetId, metric, variant }) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return prepareDataGnomadV3({ metric, variant })
  }

  if (datasetId.startsWith('gnomad_r2')) {
    return prepareDataGnomadV2({ metric, variant })
  }

  if (datasetId === 'exac') {
    return prepareDataExac({ metric, variant })
  }

  throw new Error(`No metric values for dataset "${datasetId}"`)
}

const getAvailableMetrics = datasetId => {
  if (datasetId.startsWith('gnomad_r3')) {
    return [
      'SiteQuality',
      'InbreedingCoeff',
      'AS_FS',
      'AS_MQ',
      'AS_MQRankSum',
      'AS_pab_max',
      'AS_QUALapprox',
      'AS_QD',
      'AS_ReadPosRankSum',
      'AS_SOR',
      'AS_VarDP',
      'AS_VQSLOD',
    ]
  }

  if (datasetId.startsWith('gnomad_r2')) {
    return [
      'BaseQRankSum',
      'ClippingRankSum',
      'DP',
      'FS',
      'InbreedingCoeff',
      'MQ',
      'MQRankSum',
      'pab_max',
      'QD',
      'ReadPosRankSum',
      'RF',
      'SiteQuality',
      'SOR',
      'VQSLOD',
    ]
  }

  if (datasetId === 'exac') {
    return [
      'BaseQRankSum',
      'ClippingRankSum',
      'DP',
      'FS',
      'InbreedingCoeff',
      'MQ',
      'MQRankSum',
      'QD',
      'ReadPosRankSum',
      'SiteQuality',
      'VQSLOD',
    ]
  }

  throw new Error(`No known metrics for dataset "${datasetId}"`)
}

// ================================================================================================
// Plot component
// ================================================================================================

const BinHoverTarget = styled.rect`
  pointer-events: visible;
  fill: none;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
`

const yTickFormat = n => {
  if (n >= 1e9) {
    return `${(n / 1e9).toPrecision(3)}B`
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toPrecision(3)}M`
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toPrecision(3)}K`
  }
  return `${n}`
}

const formatMetricValue = (value, metric) => {
  if (
    metric === 'SiteQuality' ||
    metric === 'AS_QUALapprox' ||
    metric === 'DP' ||
    Math.abs(value) < 0.001
  ) {
    return value === 0 ? '0' : value.toExponential(3)
  }

  return value.toLocaleString()
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const SiteQualityMetricsHistogram = ({
  metric,
  binEdges,
  exomeBinValues,
  genomeBinValues,
  exomeMetricValue,
  genomeMetricValue,
  xLabel,
  height,
  width,
}) => {
  const isLogScale = metric === 'SiteQuality' || metric === 'AS_QUALapprox' || metric === 'DP'

  const primaryValues = exomeBinValues || genomeBinValues
  const secondaryValues = exomeBinValues ? genomeBinValues : null

  const primaryMetricValue = exomeMetricValue !== null ? exomeMetricValue : genomeMetricValue
  const secondaryMetricValue = exomeMetricValue !== null ? genomeMetricValue : null

  const primaryYLabel = exomeBinValues ? 'Exome variants' : 'Genome variants'
  const secondaryYLabel = 'Genome variants'

  const primaryBarColor = exomeBinValues ? '#428bca' : '#73ab3d'
  const secondaryBarColor = '#73ab3d'

  const primaryYDomain = [0, max(primaryValues) || 1]
  const secondaryYDomain = genomeBinValues ? [0, max(genomeBinValues) || 1] : null

  const margin = {
    bottom: 60,
    left: 60,
    right: exomeBinValues && genomeBinValues ? 60 : 10,
    top: 15,
  }
  const plotWidth = width - (margin.left + margin.right)
  const plotHeight = height - (margin.top + margin.bottom)

  const bins = [...Array(binEdges.length + 1)].map((_, i) => i)

  const formatBinEdge = isLogScale ? edge => `1e${edge}` : edge => `${edge}`
  const binLabels = [
    `< ${formatBinEdge(binEdges[0])}`,
    ...[...Array(binEdges.length - 1)].map(
      (_, i) => `between ${formatBinEdge(binEdges[i])} and ${formatBinEdge(binEdges[i + 1])}`
    ),
    `> ${formatBinEdge(binEdges[binEdges.length - 1])}`,
  ]

  let formatTooltip
  if (exomeBinValues && genomeBinValues) {
    formatTooltip = binIndex => {
      return `${exomeBinValues[
        binIndex
      ].toLocaleString()} variants in exome samples and ${genomeBinValues[
        binIndex
      ].toLocaleString()} variants in genome samples with ${metric} ${binLabels[binIndex]}`
    }
  } else if (exomeBinValues) {
    formatTooltip = binIndex => {
      return `${exomeBinValues[
        binIndex
      ].toLocaleString()} variants in exome samples with ${metric} ${binLabels[binIndex]}`
    }
  } else {
    formatTooltip = binIndex => {
      return `${genomeBinValues[
        binIndex
      ].toLocaleString()} variants in genome samples with ${metric} ${binLabels[binIndex]}`
    }
  }

  const xBandScale = scaleBand().domain(bins).range([0, plotWidth])
  const bandWidth = xBandScale.bandwidth()
  const xScale = scaleLinear()
    .domain([binEdges[0], binEdges[binEdges.length - 1]])
    .range([bandWidth, plotWidth - bandWidth])

  const primaryYScale = primaryYDomain
    ? scaleLinear().domain(primaryYDomain).range([plotHeight, 0])
    : null
  const secondaryYScale = secondaryYDomain
    ? scaleLinear().domain(secondaryYDomain).range([plotHeight, 0])
    : null

  const halfBandWidth = bandWidth / 2

  const renderBars =
    exomeBinValues && genomeBinValues
      ? binIndex => {
          const primaryY = primaryYScale(primaryValues[binIndex])
          const secondaryY = secondaryYScale(secondaryValues[binIndex])
          return (
            <React.Fragment key={binIndex}>
              <rect
                x={0}
                y={primaryY}
                height={plotHeight - primaryY}
                width={halfBandWidth}
                fill={primaryBarColor}
                stroke="#333"
                strokeWidth={0.5}
              />
              <rect
                x={halfBandWidth}
                y={secondaryY}
                height={plotHeight - secondaryY}
                width={halfBandWidth}
                fill={secondaryBarColor}
                stroke="#333"
                strokeWidth={0.5}
              />
            </React.Fragment>
          )
        }
      : binIndex => {
          const y = primaryYScale(primaryValues[binIndex])
          return (
            <rect
              key={binIndex}
              x={0}
              y={y}
              height={plotHeight - y}
              width={bandWidth}
              fill={primaryBarColor}
              stroke="#333"
              strokeWidth={1}
            />
          )
        }

  const getMetricValueX = metricValue => {
    const scaledValue = isLogScale ? Math.log10(metricValue) : metricValue
    if (scaledValue < xScale.domain()[0]) {
      return halfBandWidth
    }
    if (scaledValue > xScale.domain()[1]) {
      return plotWidth - halfBandWidth
    }
    return xScale(scaledValue)
  }

  const primaryMetricValueX = getMetricValueX(primaryMetricValue)
  const secondaryMetricValueX = secondaryMetricValue ? getMetricValueX(secondaryMetricValue) : null

  const primaryLabelOnLeft = secondaryMetricValue
    ? secondaryMetricValue > primaryMetricValue
    : primaryMetricValueX > plotWidth * 0.8
  const secondaryLabelOnLeft = secondaryMetricValue && secondaryMetricValue < primaryMetricValue

  return (
    <svg height={height} width={width}>
      <line
        x1={margin.left}
        y1={margin.top + plotHeight}
        x2={margin.left + plotWidth}
        y2={margin.top + plotHeight}
        stroke="#333"
      />
      <AxisBottom
        label={xLabel}
        labelOffset={30}
        labelProps={labelProps}
        left={margin.left}
        top={margin.top + plotHeight}
        scale={xScale}
        stroke="#333"
        tickFormat={isLogScale ? value => `1e${value}` : value => `${value}`}
        tickLabelProps={value => ({
          dx: '-0.25em',
          dy: '0.25em',
          fill: '#000',
          fontSize: 10,
          textAnchor: 'end',
          transform: `translate(0, 0), rotate(-40 ${xScale(value)}, 0)`,
        })}
        tickLength={3}
        tickValues={xScale.ticks(20)}
      />

      <AxisLeft
        label={primaryYLabel}
        labelProps={labelProps}
        left={margin.left}
        numTicks={Math.min(10, primaryYDomain[1])}
        tickFormat={yTickFormat}
        tickLabelProps={() => ({
          dx: '-0.25em',
          dy: '0.25em',
          fill: '#000',
          fontSize: 10,
          textAnchor: 'end',
        })}
        top={margin.top}
        scale={primaryYScale}
        stroke="#333"
      />

      {secondaryValues && (
        <AxisRight
          label={secondaryYLabel}
          labelProps={labelProps}
          left={margin.left + plotWidth}
          numTicks={Math.min(10, secondaryYDomain[1])}
          tickFormat={yTickFormat}
          tickLabelProps={() => ({
            dx: '0.25em',
            dy: '0.25em',
            fill: '#000',
            fontSize: 10,
            textAnchor: 'start',
          })}
          top={margin.top}
          scale={secondaryYScale}
          stroke="#333"
        />
      )}

      <g transform={`translate(${margin.left},${margin.top})`}>
        {secondaryMetricValue !== null && (
          <>
            <path
              d="M 0 0 L -6 -7 L -2 -7 L -2 -15 L 2 -15 L 2 -7 L 6 -7 z"
              transform={`translate(${secondaryMetricValueX}, 0)`}
              fill={secondaryBarColor}
              stroke="#333"
              strokeWidth={1}
            />
            <line
              x1={secondaryMetricValueX}
              y1={2}
              x2={secondaryMetricValueX}
              y2={plotHeight}
              stroke={secondaryBarColor}
              strokeWidth={1}
            />
            <text
              x={secondaryLabelOnLeft ? secondaryMetricValueX - 10 : secondaryMetricValueX + 10}
              y={-5}
              fill="#000"
              fontSize={12}
              textAnchor={secondaryLabelOnLeft ? 'end' : 'start'}
            >
              {formatMetricValue(secondaryMetricValue, metric)}
            </text>
          </>
        )}
        {primaryMetricValue !== null && (
          <>
            <path
              d="M 0 0 L -6 -7 L -2 -7 L -2 -15 L 2 -15 L 2 -7 L 6 -7 z"
              transform={`translate(${primaryMetricValueX}, 0)`}
              fill={primaryBarColor}
              stroke="#333"
              strokeWidth={1}
            />
            <line
              x1={primaryMetricValueX}
              y1={2}
              x2={primaryMetricValueX}
              y2={plotHeight}
              stroke={primaryBarColor}
              strokeWidth={1}
            />
            <text
              x={primaryLabelOnLeft ? primaryMetricValueX - 10 : primaryMetricValueX + 10}
              y={-5}
              fill="#000"
              fontSize={12}
              textAnchor={primaryLabelOnLeft ? 'end' : 'start'}
            >
              {formatMetricValue(primaryMetricValue, metric)}
            </text>
          </>
        )}
      </g>

      <g transform={`translate(${margin.left},${margin.top})`}>
        {bins.map(binIndex => {
          return (
            <g key={binIndex} transform={`translate(${xBandScale(binIndex)}, 0)`}>
              {renderBars(binIndex)}

              <TooltipAnchor tooltip={formatTooltip(binIndex)}>
                <BinHoverTarget x={0} y={0} height={plotHeight} width={bandWidth} />
              </TooltipAnchor>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

SiteQualityMetricsHistogram.propTypes = {
  metric: PropTypes.string.isRequired,
  binEdges: PropTypes.arrayOf(PropTypes.number).isRequired,
  exomeBinValues: PropTypes.arrayOf(PropTypes.number),
  genomeBinValues: PropTypes.arrayOf(PropTypes.number),
  exomeMetricValue: PropTypes.number,
  genomeMetricValue: PropTypes.number,
  xLabel: PropTypes.string.isRequired,
  height: PropTypes.number,
  width: PropTypes.number,
}

SiteQualityMetricsHistogram.defaultProps = {
  exomeBinValues: null,
  genomeBinValues: null,
  exomeMetricValue: null,
  genomeMetricValue: null,
  height: 250,
  width: 500,
}

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-bottom: 1em;
`

const AutosizedSiteQualityMetricsHistogram = withSize()(({ size, ...props }) => (
  <GraphWrapper>
    <SiteQualityMetricsHistogram {...props} width={size.width} />
  </GraphWrapper>
))

// ================================================================================================
// Metrics components
// ================================================================================================

const variantSiteQualityMetricsPropTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      quality_metrics: PropTypes.shape({
        site_quality_metrics: PropTypes.arrayOf(
          PropTypes.shape({
            metric: PropTypes.string.isRequired,
            value: PropTypes.number,
          })
        ).isRequired,
      }).isRequired,
    }),
    genome: PropTypes.shape({
      quality_metrics: PropTypes.shape({
        site_quality_metrics: PropTypes.arrayOf(
          PropTypes.shape({
            metric: PropTypes.string.isRequired,
            value: PropTypes.number,
          })
        ).isRequired,
      }).isRequired,
    }),
  }).isRequired,
}

const LegendWrapper = styled.div`
  margin-top: 1em;
  margin-bottom: 1em;
`

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

const VariantSiteQualityMetricsDistribution = ({ datasetId, variant }) => {
  const [selectedMetric, setSelectedMetric] = useState('SiteQuality')
  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  )

  const availableMetrics = getAvailableMetrics(datasetId)

  const {
    binEdges,
    exomeBinValues,
    genomeBinValues,
    exomeMetricValue,
    genomeMetricValue,
    description,
  } = prepareData({
    datasetId,
    metric: selectedMetric,
    variant,
  })

  const includeExomes = selectedSequencingType.includes('e')
  const includeGenomes = selectedSequencingType.includes('g')

  let values
  if (variant.exome && variant.genome) {
    values = `${
      exomeMetricValue === null ? '–' : formatMetricValue(exomeMetricValue, selectedMetric)
    } (exome samples), ${
      genomeMetricValue === null ? '–' : formatMetricValue(genomeMetricValue, selectedMetric)
    } (genome samples)`
  } else if (variant.exome) {
    values = `${
      exomeMetricValue === null ? '–' : formatMetricValue(exomeMetricValue, selectedMetric)
    } (exome samples)`
  } else {
    values = `${
      genomeMetricValue === null ? '–' : formatMetricValue(genomeMetricValue, selectedMetric)
    } (genome samples)`
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
      </LegendWrapper>

      <AutosizedSiteQualityMetricsHistogram
        metric={selectedMetric}
        binEdges={binEdges}
        exomeBinValues={includeExomes ? exomeBinValues : null}
        genomeBinValues={includeGenomes ? genomeBinValues : null}
        exomeMetricValue={includeExomes ? exomeMetricValue : null}
        genomeMetricValue={includeGenomes ? genomeMetricValue : null}
        xLabel={selectedMetric}
      />

      {/* spacer to align controls with genotype quality metrics */}
      <div style={{ marginBottom: '0.5rem', overflow: 'hidden' }} />

      <ControlSection>
        <label htmlFor="site-quality-metrics-metric">
          Metric:{' '}
          <Select
            id="site-quality-metrics-metric"
            onChange={e => {
              setSelectedMetric(e.target.value)
            }}
            value={selectedMetric}
          >
            {availableMetrics.map(metric => {
              return (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              )
            })}
          </Select>
        </label>

        <label htmlFor="site-quality-metrics-sequencing-type">
          Sequencing types:{' '}
          <Select
            id="site-quality-metrics-sequencing-type"
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

      {selectedMetric !== 'SiteQuality' && description && <p>{description}</p>}

      <p>Value: {values}</p>

      {selectedMetric === 'SiteQuality' && <p>{description}</p>}

      {!datasetId.startsWith('gnomad_r3') && (
        <p>
          Note: These are site-level quality metrics, they may be unpredictable for multi-allelic
          sites.
        </p>
      )}
    </div>
  )
}

VariantSiteQualityMetricsDistribution.propTypes = variantSiteQualityMetricsPropTypes

const TooltipHint = styled.span`
  background-image: linear-gradient(to right, #000 75%, transparent 75%);
  background-position: 0 1.15em;
  background-size: 4px 2px;
  background-repeat: repeat-x;
`

const renderMetric = (metric, datasetId) => {
  let description
  if (metric === 'SiteQuality') {
    description = getSiteQualityMetricDescription(datasetId)
  } else if (metric.startsWith('AS_')) {
    const baseDescription = qualityMetricDescriptions[metric.slice(3)]
    if (baseDescription) {
      description = `Allele-specific ${baseDescription
        .charAt(0)
        .toLowerCase()}${baseDescription.slice(1)}`
    }
  } else {
    description = qualityMetricDescriptions[metric]
  }

  if (description) {
    return (
      <TooltipAnchor tooltip={description}>
        <TooltipHint>{metric}</TooltipHint>
      </TooltipAnchor>
    )
  }
  return metric
}

const VariantSiteQualityMetricsTable = ({ datasetId, variant }) => {
  const isVariantInExomes = Boolean(variant.exome)
  const isVariantInGenomes = Boolean(variant.genome)

  const exomeMetricValues = variant.exome
    ? variant.exome.quality_metrics.site_quality_metrics.reduce(
        (acc, m) => ({
          ...acc,
          [m.metric]: m.value,
        }),
        {}
      )
    : null
  const genomeMetricValues = variant.genome
    ? variant.genome.quality_metrics.site_quality_metrics.reduce(
        (acc, m) => ({
          ...acc,
          [m.metric]: m.value,
        }),
        {}
      )
    : null

  const availableMetrics = getAvailableMetrics(datasetId)

  return (
    <BaseTable style={{ width: '100%' }}>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          {isVariantInExomes && <th scope="col">Exome samples</th>}
          {isVariantInGenomes && <th scope="col">Genome samples</th>}
        </tr>
      </thead>
      <tbody>
        {availableMetrics.map(metric => (
          <tr key={metric}>
            <th scope="row">{renderMetric(metric, datasetId)}</th>
            {isVariantInExomes && (
              <td>
                {exomeMetricValues[metric] != null
                  ? formatMetricValue(exomeMetricValues[metric], metric)
                  : '–'}
              </td>
            )}
            {isVariantInGenomes && (
              <td>
                {genomeMetricValues[metric] != null
                  ? formatMetricValue(genomeMetricValues[metric], metric)
                  : '–'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </BaseTable>
  )
}

VariantSiteQualityMetricsTable.propTypes = variantSiteQualityMetricsPropTypes

const VariantSiteQualityMetrics = ({ datasetId, variant }) => {
  const [currentTab, setCurrentTab] = useState('distribution')

  return (
    <Tabs
      activeTabId={currentTab}
      tabs={[
        {
          id: 'distribution',
          label: 'Metric distribution',
          render: () => (
            <VariantSiteQualityMetricsDistribution datasetId={datasetId} variant={variant} />
          ),
        },
        {
          id: 'values',
          label: 'All metric values',
          render: () => <VariantSiteQualityMetricsTable datasetId={datasetId} variant={variant} />,
        },
      ]}
      onChange={setCurrentTab}
    />
  )
}

VariantSiteQualityMetrics.propTypes = variantSiteQualityMetricsPropTypes

export default VariantSiteQualityMetrics
