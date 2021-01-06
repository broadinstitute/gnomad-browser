import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { SegmentedControl, Select } from '@gnomad/ui'

import exacSiteQualityMetricDistributions from '../dataset-constants/exac/siteQualityMetricDistributions.json'
import gnomadV2SiteQualityMetricDistributions from '../dataset-constants/gnomad_r2_1_1/siteQualityMetricDistributions.json'
import gnomadV3SiteQualityMetricDistributions from '../dataset-constants/gnomad_r3/siteQualityMetricDistributions.json'
import { BarGraph } from './BarGraph'
import ControlSection from './ControlSection'

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

const getSiteQualityMetricDistributions = datasetId => {
  if (datasetId.startsWith('gnomad_r3')) {
    return gnomadV3SiteQualityMetricDistributions
  }
  if (datasetId.startsWith('gnomad_r2')) {
    return gnomadV2SiteQualityMetricDistributions
  }
  if (datasetId === 'exac') {
    return exacSiteQualityMetricDistributions
  }
  throw new Error(`No quality metric distribution available for dataset "${datasetId}"`)
}

// TODO: clean this up
const getMetricInfo = ({ datasetId, metric, exomeOrGenome, ac, an }) => {
  let metricBins
  let metricDescription

  if (datasetId.startsWith('gnomad_r2') || datasetId === 'exac') {
    const siteQualityMetricDistributions = getSiteQualityMetricDistributions(datasetId)
    const metricData = siteQualityMetricDistributions[exomeOrGenome]

    if (metric === 'SiteQuality') {
      if (ac === 1) {
        metricBins = metricData.siteQuality.singleton.bin_freq.map((n, i) => ({
          x0: metricData.siteQuality.singleton.bin_edges[i],
          x1: metricData.siteQuality.singleton.bin_edges[i + 1],
          n,
        }))
        metricDescription = 'This is the site quality distribution for all singleton variants.'
      } else if (ac === 2) {
        metricBins = metricData.siteQuality.doubleton.bin_freq.map((n, i) => ({
          x0: metricData.siteQuality.doubleton.bin_edges[i],
          x1: metricData.siteQuality.doubleton.bin_edges[i + 1],
          n,
        }))
        metricDescription = 'This is the site quality distribution for all doubleton variants.'
      } else {
        const variantAlleleFreq = an === 0 ? 0 : ac / an
        const selectedAlleleFreqBin = metricData.siteQuality.af_bins.find(
          bin =>
            bin.min_af <= variantAlleleFreq &&
            (variantAlleleFreq < bin.max_af ||
              (variantAlleleFreq === 1 && variantAlleleFreq <= bin.max_af))
        )
        metricBins = selectedAlleleFreqBin.histogram.bin_freq.map((n, i) => ({
          x0: selectedAlleleFreqBin.histogram.bin_edges[i],
          x1: selectedAlleleFreqBin.histogram.bin_edges[i + 1],
          n,
        }))
        metricDescription = `This is the site quality distribution for all variants with ${
          selectedAlleleFreqBin.min_af
        } <= AF ${selectedAlleleFreqBin.max_af === 1 ? '<=' : '<'} ${selectedAlleleFreqBin.max_af}.`
      }
    } else {
      const { histogram } = metricData.otherMetrics.find(m => m.metric === metric)

      metricBins = histogram.bin_freq.map((n, i) => ({
        x0: histogram.bin_edges[i],
        x1: histogram.bin_edges[i + 1],
        n,
      }))

      metricDescription = qualityMetricDescriptions[metric]
    }
  }

  if (datasetId.startsWith('gnomad_r3')) {
    let key
    if (metric === 'SiteQuality' || metric === 'AS_QUALapprox') {
      if (ac === 1) {
        key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-binned_singleton`
        metricDescription = `${
          metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
        } approximation for all singleton variants.`
      } else if (ac === 2) {
        key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-binned_doubleton`
        metricDescription = `${
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
          metricDescription = `${
            metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
          } approximation for all variants with AF >= ${afBin.min}.`
        } else
          metricDescription = `${
            metric === 'SiteQuality' ? 'Site quality' : 'Allele-specific variant qual'
          } approximation for all variants with ${afBin.min} <= AF ${
            afBin.max === 1 ? '<=' : '<'
          } ${afBin.max}.`
        key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-binned_${afBin.key}`
      }
    } else if (metric === 'InbreedingCoeff') {
      const af = an === 0 ? 0 : ac / an
      if (af < 0.0005) {
        key = `${metric === 'SiteQuality' ? 'QUALapprox' : metric}-under_0.0005`
        metricDescription = 'InbreedingCoeff for all variants with AF < 0.0005.'
      } else {
        key = 'InbreedingCoeff-over_0.0005'
        metricDescription = 'InbreedingCoeff for all variants with AF >= 0.0005.'
      }
    } else {
      key = metric
      if (metric.startsWith('AS_')) {
        const baseDescription = qualityMetricDescriptions[metric.slice(3)]
        if (baseDescription) {
          metricDescription = `Allele-specific ${baseDescription
            .charAt(0)
            .toLowerCase()}${baseDescription.slice(1)}`
        }
      } else {
        metricDescription = qualityMetricDescriptions[metric]
      }
    }

    const histogram = gnomadV3SiteQualityMetricDistributions.find(m => m.metric === key)
    if (metric === 'SiteQuality' || metric === 'AS_QUALapprox') {
      metricBins = histogram.bin_freq.map((n, i) => ({
        x0: 10 ** histogram.bin_edges[i],
        x1: 10 ** histogram.bin_edges[i + 1],
        n,
      }))
    } else {
      metricBins = histogram.bin_freq.map((n, i) => ({
        x0: histogram.bin_edges[i],
        x1: histogram.bin_edges[i + 1],
        n,
      }))
    }
  }

  return { metricBins, metricDescription }
}

const variantSiteQualityMetricsPropType = PropTypes.arrayOf(
  PropTypes.shape({
    metric: PropTypes.string.isRequired,
    value: PropTypes.number,
  })
)

class VariantSiteQualityMetrics extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    variant: PropTypes.shape({
      exome: PropTypes.shape({
        quality_metrics: PropTypes.shape({
          site_quality_metrics: variantSiteQualityMetricsPropType.isRequired,
        }).isRequired,
      }),
      genome: PropTypes.shape({
        quality_metrics: PropTypes.shape({
          site_quality_metrics: variantSiteQualityMetricsPropType.isRequired,
        }).isRequired,
      }),
    }).isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      selectedDataset: props.variant.exome ? 'exome' : 'genome',
      selectedMetric: 'SiteQuality',
    }
  }

  render() {
    const { datasetId, variant } = this.props
    const { selectedDataset, selectedMetric } = this.state

    const { metricBins, metricDescription } = getMetricInfo({
      datasetId,
      metric: selectedMetric,
      exomeOrGenome: selectedDataset,
      ac: variant[selectedDataset].ac,
      an: variant[selectedDataset].an,
    })

    const variantData = variant[selectedDataset]

    const graphColor = selectedDataset === 'exome' ? '#428bca' : '#73ab3d'

    const availableMetrics = variantData.quality_metrics.site_quality_metrics.filter(
      ({ value }) => value !== null
    )

    const useLogScale =
      selectedMetric === 'SiteQuality' ||
      selectedMetric === 'AS_QUALapprox' ||
      selectedMetric === 'DP'

    const formatTooltip = useLogScale
      ? bin => `1e${Math.log10(bin.x0)}-1e${Math.log10(bin.x1)}: ${bin.n.toLocaleString()} variants`
      : bin => `${bin.x0}-${bin.x1}: ${bin.n.toLocaleString()} variants`

    return (
      <div>
        <BarGraph
          barColor={graphColor}
          bins={metricBins}
          highlightValue={
            variantData.quality_metrics.site_quality_metrics.find(
              ({ metric }) => metric === selectedMetric
            ).value
          }
          logScale={useLogScale}
          xLabel={selectedMetric}
          yLabel="Variants"
          formatTooltip={formatTooltip}
        />

        <ControlSection>
          <Select
            onChange={e => {
              this.setState({ selectedMetric: e.target.value })
            }}
            value={selectedMetric}
          >
            {availableMetrics.map(({ metric, value }) => {
              return (
                <option key={metric} value={metric}>
                  {metric} ({value.toPrecision(4).replace(/\.0+$/, '')})
                </option>
              )
            })}
          </Select>

          <SegmentedControl
            id="site-quality-metrics-dataset"
            onChange={dataset => {
              this.setState({ selectedDataset: dataset })
            }}
            options={[
              { disabled: !variant.exome, label: 'Exomes', value: 'exome' },
              {
                disabled: !variant.genome,
                label: 'Genomes',
                value: 'genome',
              },
            ]}
            value={selectedDataset}
          />
        </ControlSection>

        {metricDescription && <p>{metricDescription}</p>}
        {!datasetId.startsWith('gnomad_r3') && (
          <p>
            Note: These are site-level quality metrics, they may be unpredictable for multi-allelic
            sites.
          </p>
        )}
      </div>
    )
  }
}

export default VariantSiteQualityMetrics
