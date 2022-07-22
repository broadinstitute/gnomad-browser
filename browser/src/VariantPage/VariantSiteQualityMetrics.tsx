import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import React, { useState } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft, AxisRight } from '@vx/axis'

import { BaseTable, Select, Tabs, TooltipAnchor } from '@gnomad/ui'

// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import exacSiteQualityMetricDistributions from '@gnomad/dataset-metadata/datasets/exac/siteQualityMetricDistributions.json'
// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
import gnomadV2SiteQualityMetricDistributions from '@gnomad/dataset-metadata/datasets/gnomad-v2/siteQualityMetricDistributions.json'
// @ts-expect-error TS(2732) FIXME: Cannot find module '@gnomad/dataset-metadata/datas... Remove this comment to see the full error message
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

const getSiteQualityMetricDescription = (datasetId: any) => {
  return datasetId.startsWith('gnomad_r2') || datasetId === 'exac'
    ? 'Phred-scaled quality score for the assertion made in ALT. i.e. −10log10 prob(no variant). High Phred-scaled quality scores indicate high confidence calls.'
    : 'Sum of PL[0] values; used to approximate the Phred-scaled quality score for the assertion made in ALT. i.e. −10log10 prob(no variant). High Phred-scaled quality scores indicate high confidence calls.'
}

// ================================================================================================
// Data munging
// ================================================================================================

const prepareDataGnomadV3 = ({ metric, variant }: any) => {
  let key: any
  let description

  const genomeMetricValue = variant.genome.quality_metrics.site_quality_metrics.find(
    (m: any) => m.metric === metric
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
      const afBin = afBins.find((bin: any) => bin.min <= af && af < bin.max)
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      if (afBin.max === Infinity) {
        description = `${
          metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
        } approximation for all variants with AF >= ${
          // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
          afBin.min
        }.`
      } else
        description = `${
          metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
        } approximation for all variants with ${
          // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
          afBin.min
        } <= AF ${
          // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
          afBin.max === 1 ? '<=' : '<'
        } ${
          // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
          afBin.max
        }.`
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
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
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      const baseDescription = qualityMetricDescriptions[metric.slice(3)]
      if (baseDescription) {
        description = `Allele-specific ${baseDescription
          .charAt(0)
          .toLowerCase()}${baseDescription.slice(1)}`
      }
    } else {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      description = qualityMetricDescriptions[metric]
    }
  }

  const histogram = gnomadV3SiteQualityMetricDistributions.find((m: any) => m.metric === key)
  const binEdges = histogram.bin_edges

  const genomeBinValues = [histogram.n_smaller, ...histogram.bin_freq, histogram.n_larger]

  return { binEdges, genomeBinValues, genomeMetricValue, description }
}

const prepareDataGnomadV2 = ({ metric, variant }: any) => {
  let binEdges
  let exomeBinValues
  let genomeBinValues
  let exomeMetricValue
  let genomeMetricValue
  let description

  if (variant.exome) {
    exomeMetricValue = variant.exome.quality_metrics.site_quality_metrics.find(
      (m: any) => m.metric === metric
    ).value
  }
  if (variant.genome) {
    genomeMetricValue = variant.genome.quality_metrics.site_quality_metrics.find(
      (m: any) => m.metric === metric
    ).value
  }

  if (metric === 'SiteQuality') {
    const getAFBin = ({ sequencingType, ac, an }: any) => {
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
          (bin: any) => bin.min_af <= af && (af < bin.max_af || (af === 1 && af <= bin.max_af))
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
          (edge: any, i: any) => Math.abs(edge - genomeBin.histogram.bin_edges[i]) < 0.001
        )
      ) {
        throw new Error(
          `gnomAD v2 site quality bin edges do not match for ${exomeBin.label} exomes and ${genomeBin.label} genomes`
        )
      }
    }

    // @ts-expect-error TS(2339) FIXME: Property 'histogram' does not exist on type '{ his... Remove this comment to see the full error message
    const { histogram } = exomeBin || genomeBin
    binEdges = histogram.bin_edges.map((edge: any) => Math.log10(edge))

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
      // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
      description = `This is the site quality distribution for all ${exomeBin.label} and all ${genomeBin.label}.`
    } else {
      description = `This is the site quality distribution for all ${
        // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
        (exomeBin || genomeBin).label
      }.`
    }
  } else {
    const exomeHistogram = gnomadV2SiteQualityMetricDistributions.exome.otherMetrics.find(
      (m: any) => m.metric === metric
    ).histogram
    const genomeHistogram = gnomadV2SiteQualityMetricDistributions.genome.otherMetrics.find(
      (m: any) => m.metric === metric
    ).histogram

    if (process.env.NODE_ENV === 'development') {
      if (
        !exomeHistogram.bin_edges.every(
          (edge: any, i: any) => Math.abs(edge - genomeHistogram.bin_edges[i]) < 0.001
        )
      ) {
        throw new Error(`gnomAD v2 ${metric} bin edges do not match for exomes and genomes`)
      }
    }

    binEdges =
      metric === 'DP'
        ? exomeHistogram.bin_edges.map((edge: any) => Math.log10(edge))
        : exomeHistogram.bin_edges
    exomeBinValues = [exomeHistogram.n_smaller, ...exomeHistogram.bin_freq, exomeHistogram.n_larger]
    genomeBinValues = [
      genomeHistogram.n_smaller,
      ...genomeHistogram.bin_freq,
      genomeHistogram.n_larger,
    ]

    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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

const prepareDataExac = ({ metric, variant }: any) => {
  const exomeMetricValue = variant.exome.quality_metrics.site_quality_metrics.find(
    (m: any) => m.metric === metric
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
        (bin: any) => bin.min_af <= af && (af < bin.max_af || (af === 1 && af <= bin.max_af))
      )
      histogram = afBin.histogram
      description = `This is the site quality distribution for all variants with ${
        afBin.min_af
      } <= AF ${afBin.max_af === 1 ? '<=' : '<'} ${afBin.max_af}.`
    }
    binEdges = histogram.bin_edges.map((edge: any) => Math.log10(edge))
  } else {
    histogram = exacSiteQualityMetricDistributions.exome.otherMetrics.find(
      (m: any) => m.metric === metric
    ).histogram
    binEdges =
      metric === 'DP'
        ? histogram.bin_edges.map((edge: any) => Math.log10(edge))
        : histogram.binEdges
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    description = qualityMetricDescriptions[metric]
  }

  const exomeBinValues = [0, ...histogram.bin_freq, 0]

  return { binEdges, exomeBinValues, exomeMetricValue, description }
}

const prepareData = ({ datasetId, metric, variant }: any) => {
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

const getAvailableMetrics = (datasetId: any) => {
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

const yTickFormat = (n: any) => {
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

const formatMetricValue = (value: any, metric: any) => {
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

type OwnSiteQualityMetricsHistogramProps = {
  metric: string
  binEdges: number[]
  exomeBinValues?: number[]
  genomeBinValues?: number[]
  exomeMetricValue?: number
  genomeMetricValue?: number
  xLabel: string
  height?: number
  width?: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'SiteQualityMetricsHistogramProps' circ... Remove this comment to see the full error message
type SiteQualityMetricsHistogramProps = OwnSiteQualityMetricsHistogramProps &
  typeof SiteQualityMetricsHistogram.defaultProps

// @ts-expect-error TS(7022) FIXME: 'SiteQualityMetricsHistogram' implicitly has type ... Remove this comment to see the full error message
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
}: SiteQualityMetricsHistogramProps) => {
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

  const formatBinEdge = isLogScale ? (edge: any) => `1e${edge}` : (edge: any) => `${edge}`
  const binLabels = [
    `< ${formatBinEdge(binEdges[0])}`,
    ...[...Array(binEdges.length - 1)].map(
      (_, i) => `between ${formatBinEdge(binEdges[i])} and ${formatBinEdge(binEdges[i + 1])}`
    ),
    `> ${formatBinEdge(binEdges[binEdges.length - 1])}`,
  ]

  let formatTooltip: any
  if (exomeBinValues && genomeBinValues) {
    formatTooltip = (binIndex: any) => {
      return `${exomeBinValues[
        binIndex
      ].toLocaleString()} variants in exome samples and ${genomeBinValues[
        binIndex
      ].toLocaleString()} variants in genome samples with ${metric} ${binLabels[binIndex]}`
    }
  } else if (exomeBinValues) {
    formatTooltip = (binIndex: any) => {
      return `${exomeBinValues[
        binIndex
      ].toLocaleString()} variants in exome samples with ${metric} ${binLabels[binIndex]}`
    }
  } else {
    formatTooltip = (binIndex: any) => {
      return `${genomeBinValues[
        binIndex
      ].toLocaleString()} variants in genome samples with ${metric} ${binLabels[binIndex]}`
    }
  }

  // @ts-expect-error TS(2345) FIXME: Argument of type 'number[]' is not assignable to p... Remove this comment to see the full error message
  const xBandScale = scaleBand().domain(bins).range([0, plotWidth])
  const bandWidth = xBandScale.bandwidth()
  const xScale = scaleLinear()
    .domain([binEdges[0], binEdges[binEdges.length - 1]])
    .range([bandWidth, plotWidth - bandWidth])

  const primaryYScale = primaryYDomain
    ? // @ts-expect-error TS(2345) FIXME: Argument of type '(string | number)[]' is not assi... Remove this comment to see the full error message
      scaleLinear().domain(primaryYDomain).range([plotHeight, 0])
    : null
  const secondaryYScale = secondaryYDomain
    ? // @ts-expect-error TS(2345) FIXME: Argument of type '(string | number)[]' is not assi... Remove this comment to see the full error message
      scaleLinear().domain(secondaryYDomain).range([plotHeight, 0])
    : null

  const halfBandWidth = bandWidth / 2

  const renderBars =
    exomeBinValues && genomeBinValues
      ? (binIndex: any) => {
          // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
          const primaryY = primaryYScale(primaryValues[binIndex])
          // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
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
      : (binIndex: any) => {
          // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
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

  const getMetricValueX = (metricValue: any) => {
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
        // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
        labelProps={labelProps}
        left={margin.left}
        top={margin.top + plotHeight}
        scale={xScale}
        stroke="#333"
        tickFormat={isLogScale ? (value) => `1e${value}` : (value) => `${value}`}
        tickLabelProps={(value) => ({
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
        // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
        labelProps={labelProps}
        left={margin.left}
        // @ts-expect-error TS(2345) FIXME: Argument of type 'string | number' is not assignab... Remove this comment to see the full error message
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
        // @ts-expect-error TS(2322) FIXME: Type '(number[] & ScaleLinear<number, number, neve... Remove this comment to see the full error message
        scale={primaryYScale}
        stroke="#333"
      />

      {secondaryValues && (
        <AxisRight
          label={secondaryYLabel}
          // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
          labelProps={labelProps}
          left={margin.left + plotWidth}
          // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
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
          // @ts-expect-error TS(2322) FIXME: Type '(number[] & ScaleLinear<number, number, neve... Remove this comment to see the full error message
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
              // @ts-expect-error TS(2322) FIXME: Type 'number | null' is not assignable to type 'st... Remove this comment to see the full error message
              x1={secondaryMetricValueX}
              y1={2}
              // @ts-expect-error TS(2322) FIXME: Type 'number | null' is not assignable to type 'st... Remove this comment to see the full error message
              x2={secondaryMetricValueX}
              y2={plotHeight}
              stroke={secondaryBarColor}
              strokeWidth={1}
            />
            <text
              // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
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
        {bins.map((binIndex) => {
          return (
            // @ts-expect-error TS(2345) FIXME: Argument of type 'number' is not assignable to par... Remove this comment to see the full error message
            <g key={binIndex} transform={`translate(${xBandScale(binIndex)}, 0)`}>
              {renderBars(binIndex)}

              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
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

// @ts-expect-error TS(2339) FIXME: Property 'size' does not exist on type '{}'.
const AutosizedSiteQualityMetricsHistogram = withSize()(({ size, ...props }) => (
  <GraphWrapper>
    <SiteQualityMetricsHistogram {...props} width={size.width} />
  </GraphWrapper>
))

type VariantSiteQualityMetricsDistributionProps = {
  datasetId: string
  variant: {
    exome?: {
      quality_metrics: {
        site_quality_metrics: {
          metric: string
          value?: number
        }[]
      }
    }
    genome?: {
      quality_metrics: {
        site_quality_metrics: {
          metric: string
          value?: number
        }[]
      }
    }
  }
}

type VariantSiteQualityMetricsTableProps = {
  datasetId: string
  variant: {
    exome?: {
      quality_metrics: {
        site_quality_metrics: {
          metric: string
          value?: number
        }[]
      }
    }
    genome?: {
      quality_metrics: {
        site_quality_metrics: {
          metric: string
          value?: number
        }[]
      }
    }
  }
}

type VariantSiteQualityMetricsProps = {
  datasetId: string
  variant: {
    exome?: {
      quality_metrics: {
        site_quality_metrics: {
          metric: string
          value?: number
        }[]
      }
    }
    genome?: {
      quality_metrics: {
        site_quality_metrics: {
          metric: string
          value?: number
        }[]
      }
    }
  }
}

const LegendWrapper = styled.div`
  margin-top: 1em;
  margin-bottom: 1em;
`

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

const VariantSiteQualityMetricsDistribution = ({
  datasetId,
  variant,
}: VariantSiteQualityMetricsDistributionProps) => {
  const [selectedMetric, setSelectedMetric] = useState('SiteQuality')
  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  )

  const availableMetrics = getAvailableMetrics(datasetId)

  const {
    binEdges,
    // @ts-expect-error TS(2339) FIXME: Property 'exomeBinValues' does not exist on type '... Remove this comment to see the full error message
    exomeBinValues,
    // @ts-expect-error TS(2339) FIXME: Property 'genomeBinValues' does not exist on type ... Remove this comment to see the full error message
    genomeBinValues,
    // @ts-expect-error TS(2339) FIXME: Property 'exomeMetricValue' does not exist on type... Remove this comment to see the full error message
    exomeMetricValue,
    // @ts-expect-error TS(2339) FIXME: Property 'genomeMetricValue' does not exist on typ... Remove this comment to see the full error message
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
        // @ts-expect-error TS(2322) FIXME: Type '{ metric: string; binEdges: any; exomeBinVal... Remove this comment to see the full error message
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
          Metric: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="site-quality-metrics-metric"
            onChange={(e: any) => {
              setSelectedMetric(e.target.value)
            }}
            value={selectedMetric}
          >
            {availableMetrics.map((metric) => {
              return (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              )
            })}
          </Select>
        </label>

        <label htmlFor="site-quality-metrics-sequencing-type">
          Sequencing types: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="site-quality-metrics-sequencing-type"
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

const TooltipHint = styled.span`
  background-image: linear-gradient(to right, #000 75%, transparent 75%);
  background-position: 0 1.15em;
  background-size: 4px 2px;
  background-repeat: repeat-x;
`

const renderMetric = (metric: any, datasetId: any) => {
  let description
  if (metric === 'SiteQuality') {
    description = getSiteQualityMetricDescription(datasetId)
  } else if (metric.startsWith('AS_')) {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const baseDescription = qualityMetricDescriptions[metric.slice(3)]
    if (baseDescription) {
      description = `Allele-specific ${baseDescription
        .charAt(0)
        .toLowerCase()}${baseDescription.slice(1)}`
    }
  } else {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    description = qualityMetricDescriptions[metric]
  }

  if (description) {
    return (
      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message
      <TooltipAnchor tooltip={description}>
        <TooltipHint>{metric}</TooltipHint>
      </TooltipAnchor>
    )
  }
  return metric
}

const VariantSiteQualityMetricsTable = ({
  datasetId,
  variant,
}: VariantSiteQualityMetricsTableProps) => {
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
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    <BaseTable style={{ width: '100%' }}>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          {isVariantInExomes && <th scope="col">Exome samples</th>}
          {isVariantInGenomes && <th scope="col">Genome samples</th>}
        </tr>
      </thead>
      <tbody>
        {availableMetrics.map((metric) => (
          <tr key={metric}>
            <th scope="row">{renderMetric(metric, datasetId)}</th>
            {isVariantInExomes && (
              <td>
                {/* @ts-expect-error TS(2531) FIXME: Object is possibly 'null'. */}
                {exomeMetricValues[metric] != null
                  ? // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
                    formatMetricValue(exomeMetricValues[metric], metric)
                  : '–'}
              </td>
            )}
            {isVariantInGenomes && (
              <td>
                {/* @ts-expect-error TS(2531) FIXME: Object is possibly 'null'. */}
                {genomeMetricValues[metric] != null
                  ? // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
                    formatMetricValue(genomeMetricValues[metric], metric)
                  : '–'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </BaseTable>
  )
}

const VariantSiteQualityMetrics = ({ datasetId, variant }: VariantSiteQualityMetricsProps) => {
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

export default VariantSiteQualityMetrics
