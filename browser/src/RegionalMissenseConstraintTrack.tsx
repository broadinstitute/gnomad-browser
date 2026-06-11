import React from 'react'

import { Track } from '@gnomad/region-viewer'

import Link from './Link'

import InfoButton from './help/InfoButton'
import { Gene } from './GenePage/GenePage'
import ConstraintTrack, {
  SidePanel,
  PlotWrapper,
  regionsInExons,
  RegionAttributeList,
  RegionWithUnclamped,
} from './ConstraintTrack'
import { Badge } from '@gnomad/ui'

export type RegionalMissenseConstraint = {
  has_no_rmc_evidence: boolean
  is_outlier: boolean
  is_outlier_no_display: boolean
  regions: RegionalMissenseConstraintRegion[]
}

export type RegionalMissenseConstraintRegion = {
  chrom: string
  start: number
  stop: number
  aa_start: string | null
  aa_stop: string | null
  obs_mis: number | null
  exp_mis: number | null
  obs_exp: number | null
  chisq_diff_null: number | undefined
  p_value: number
  z_score: number | null

  low_coverage: boolean | null
  percentile: string | null
  no_color: boolean | null
}

// https://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=5
const colorScale = {
  not_significant: '#e2e2e2',
  lightest: '#ffffb2',
  lighter: '#fecc5c',
  middle: '#fd8d3c',
  darker: '#de351b',
  darkest: '#9b001f',
}

function regionColor(region: RegionalMissenseConstraintRegion) {
  if (region.z_score) {
    return region.z_score > 3.09 ? colorScale.middle : colorScale.not_significant
  }

  const regionObsExpExists = region.obs_exp !== undefined && region.obs_exp !== null
  const regionHasSignificantPValue = region.p_value <= 1e-2
  const regionHasLowCoverage = region.low_coverage === true
  const regionHasNoColorFlag = region.no_color === true

  if (
    regionObsExpExists &&
    regionHasSignificantPValue &&
    !regionHasLowCoverage &&
    !regionHasNoColorFlag
  ) {
    if (region.obs_exp! > 0.8) {
      return colorScale.lightest
    }
    if (region.obs_exp! > 0.6) {
      return colorScale.lighter
    }
    if (region.obs_exp! > 0.4) {
      return colorScale.middle
    }
    if (region.obs_exp! > 0.2) {
      return colorScale.darker
    }
    return colorScale.darkest
  }

  return colorScale.not_significant
}

const Legend = () => {
  return (
    <>
      <span>Missense observed/expected</span>
      <svg width={170} height={25}>
        <rect x={10} y={1} width={30} height={10} stroke="#000" fill={colorScale.darkest} />
        <rect x={40} y={1} width={30} height={10} stroke="#000" fill={colorScale.darker} />
        <rect x={70} y={1} width={30} height={10} stroke="#000" fill={colorScale.middle} />
        <rect x={100} y={1} width={30} height={10} stroke="#000" fill={colorScale.lighter} />
        <rect x={130} y={1} width={30} height={10} stroke="#000" fill={colorScale.lightest} />
        <text x={10} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          0.0
        </text>
        <text x={40} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          0.2
        </text>
        <text x={70} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          0.4
        </text>
        <text x={100} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          0.6
        </text>
        <text x={130} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          0.8
        </text>
        <text x={160} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          1.0+
        </text>
      </svg>
      <svg width={170} height={25}>
        <rect x={10} y={1} width={20} height={10} stroke="#000" fill={colorScale.not_significant} />
        <text x={35} y={1} fontSize="10" dy="1em" textAnchor="start">
          Not significant (p &gt; 1e-3)
        </text>
      </svg>
    </>
  )
}

const renderNumber = (number: number | null | undefined) => {
  return number === undefined || number === null ? '-' : number.toPrecision(4)
}

const renderNumberExponential = (number: number | undefined) => {
  if (number === undefined || number === null) {
    return '-'
  }

  // -0.01 is a sentinel value signifying to use gnomAD constraint instead
  //   no real pValue here, so render '-'
  if (number === -0.01) {
    return '-'
  }

  return number.toExponential(3)
}

const printAAorNA = (aa: string | null) => {
  if (aa === null) {
    return 'n/a'
  }
  return aa
}

type MissenseConstraintRegionTooltipProps = {
  region: RegionWithUnclamped<RegionalMissenseConstraintRegion>
  isTranscriptWide: boolean
}

export const MissenseConstraintRegionTooltip = ({
  region,
  isTranscriptWide,
}: MissenseConstraintRegionTooltipProps) => {
  if (isTranscriptWide) {
    return (
      <RegionAttributeList>
        <div>
          <dt>Missense observed/expected:</dt>
          <dd>{`${renderNumber(region.obs_exp)} (${region.obs_mis}/${renderNumber(
            region.exp_mis
          )})`}</dd>
        </div>
        <br />
        <div>The observed/expected ratio for this gene is transcript-wide.</div>
      </RegionAttributeList>
    )
  }
  return (
    <RegionAttributeList>
      <div>
        <dt>Coordinates:</dt>
        <dd>{`${region.chrom}:${region.unclamped_start}-${region.unclamped_stop}`}</dd>
      </div>
      <div>
        <dt>Amino acids:</dt>
        <dd>{`${printAAorNA(region.aa_start)}-${printAAorNA(region.aa_stop)}`}</dd>
      </div>
      <div>
        <dt>Missense observed/expected:</dt>
        <dd>{`${renderNumber(region.obs_exp)} (${region.obs_mis}/${renderNumber(
          region.exp_mis
        )})`}</dd>
      </div>
      <div>
        <dt>p-value:</dt>
        <dd>
          {renderNumberExponential(region.p_value)}
          {region.p_value !== null && region.p_value > 0.001 && ' (not significant)'}
        </dd>
      </div>
      {region.percentile && (
        <div>
          <dt>Missense oe percentile:</dt>
          <dd>{region.percentile}</dd>
        </div>
      )}
      {region.low_coverage === true && (
        <div>
          <dt>Warning:</dt>
          <dd>This region has low coverage</dd>
        </div>
      )}
    </RegionAttributeList>
  )
}

const formattedOE = (region: RegionalMissenseConstraintRegion) =>
  region.obs_exp ? region.obs_exp.toFixed(2) : ''

type NoRMCProps = {
  trackTitle: string
}

const NoRMCConstraint = ({ trackTitle }: NoRMCProps) => {
  return (
    <Track
      renderLeftPanel={() => (
        <SidePanel>
          <span>{trackTitle}</span>
          <InfoButton topic="regional-constraint" />
        </SidePanel>
      )}
    >
      {({ width }: { width: number }) => (
        <>
          <PlotWrapper>
            <svg height={35} width={width}>
              <text x={width / 2} y={35 / 2} dy="1.0rem" textAnchor="middle">
                <tspan>Regional missense constraint is not available for this gene.</tspan>
              </text>
            </svg>
          </PlotWrapper>
        </>
      )}
    </Track>
  )
}

type RegionalMissenseConstraintTrackProps = {
  trackTitle?: string
  gene: Gene
  regionalMissenseConstraint: RegionalMissenseConstraint | null
}

const RegionalMissenseConstraintTrack = ({
  trackTitle = 'Regional missense constraint',
  gene,
  regionalMissenseConstraint,
}: RegionalMissenseConstraintTrackProps) => {
  const transcriptWasNotSearchedForRMC = regionalMissenseConstraint === null
  const transcriptHasOutlierDoNotDisplayFlag = regionalMissenseConstraint?.is_outlier_no_display

  if (transcriptWasNotSearchedForRMC || transcriptHasOutlierDoNotDisplayFlag) {
    return <NoRMCConstraint trackTitle={trackTitle} />
  }

  // This transcript was searched, but no RMC evidence was found
  //   instead, use the available gene level constraint data to display a single
  //   region for the RMC track
  if (regionalMissenseConstraint.has_no_rmc_evidence) {
    // eslint-disable-next-line no-param-reassign
    regionalMissenseConstraint.regions = []

    if (gene.gnomad_constraint) {
      // eslint-disable-next-line no-param-reassign
      regionalMissenseConstraint.regions = [
        {
          chrom: gene.chrom,
          start: Math.min(gene.start, gene.stop),
          stop: Math.max(gene.start, gene.stop),
          obs_mis: gene.gnomad_constraint.obs_mis,
          exp_mis: gene.gnomad_constraint.exp_mis,
          obs_exp: gene.gnomad_constraint.oe_mis,
          z_score: gene.gnomad_constraint.mis_z,
          p_value: -0.01,
          chisq_diff_null: undefined,
          aa_start: null,
          aa_stop: null,

          low_coverage: null,
          percentile: null,
          no_color: null,
        },
      ]
    }
  }

  const constraintInCodingSections = regionsInExons(
    regionalMissenseConstraint.regions,
    gene.exons.filter((exon) => exon.feature_type === 'CDS')
  )

  return (
    <>
      <ConstraintTrack
        trackTitle={trackTitle}
        allRegions={regionalMissenseConstraint.regions}
        constrainedRegions={constraintInCodingSections}
        infobuttonTopic="regional-constraint"
        colorFn={regionColor}
        legend={<Legend />}
        tooltipComponent={MissenseConstraintRegionTooltip}
        valueFn={formattedOE}
      />
      {regionalMissenseConstraint.is_outlier && (
        <p style={{ marginTop: '-1rem' }}>
          <Badge level="info">Note</Badge> This gene has constraint flags
        </p>
      )}
    </>
  )
}

RegionalMissenseConstraintTrack.defaultProps = {
  height: 15,
}

export default RegionalMissenseConstraintTrack
