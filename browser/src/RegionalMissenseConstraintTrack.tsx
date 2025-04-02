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

export type RegionalMissenseConstraintRegion = {
  chrom: string
  start: number
  stop: number
  aa_start: string | null
  aa_stop: string | null
  obs_mis: number | null
  exp_mis: number
  obs_exp: number
  chisq_diff_null: number | undefined
  p_value: number
  z_score: number | null
}

// https://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=5
const colorScale = {
  not_significant: '#e2e2e2',
  least: '#9b001f',
  less: '#de351b',
  middle: '#fd8d3c',
  greater: '#fecc5c',
  greatest: '#ffffb2',
}

function regionColor(region: RegionalMissenseConstraintRegion) {
  if (region.z_score) {
    return region.z_score > 3.09 ? colorScale.middle : colorScale.not_significant
  }

  let color
  if (region.obs_exp > 0.8) {
    color = colorScale.greatest
  } else if (region.obs_exp > 0.6) {
    color = colorScale.greater
  } else if (region.obs_exp > 0.4) {
    color = colorScale.middle
  } else if (region.obs_exp > 0.2) {
    color = colorScale.less
  } else {
    color = colorScale.least
  }

  return region.p_value > 0.001 ? colorScale.not_significant : color
}

const Legend = () => {
  return (
    <>
      <span>Missense observed/expected</span>
      <svg width={170} height={25}>
        <rect x={10} y={1} width={30} height={10} stroke="#000" fill={colorScale.least} />
        <rect x={40} y={1} width={30} height={10} stroke="#000" fill={colorScale.less} />
        <rect x={70} y={1} width={30} height={10} stroke="#000" fill={colorScale.middle} />
        <rect x={100} y={1} width={30} height={10} stroke="#000" fill={colorScale.greater} />
        <rect x={130} y={1} width={30} height={10} stroke="#000" fill={colorScale.greatest} />
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

const renderNumber = (number: number | undefined) => {
  return number === undefined || number === null ? '-' : number.toPrecision(4)
}

const renderNumberExponential = (number: number | undefined) => {
  return number === undefined || number === null ? '-' : number.toExponential(3)
}

const printAAorNA = (aa: string | null) => {
  if (aa === null) {
    return 'n/a'
  }
  return aa
}

type RegionTooltipProps = {
  region: RegionWithUnclamped<RegionalMissenseConstraintRegion>
  isTranscriptWide: boolean
}

export const RegionTooltip = ({ region, isTranscriptWide }: RegionTooltipProps) => {
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
    </RegionAttributeList>
  )
}

export type RegionalMissenseConstraint = {
  has_no_rmc_evidence: boolean
  passed_qc: boolean
  regions: RegionalMissenseConstraintRegion[]
}

const formattedOE = (region: RegionalMissenseConstraintRegion) => region.obs_exp.toFixed(2)

type Props = {
  regionalMissenseConstraint: RegionalMissenseConstraint | null
  gene: Gene
}

const NoRMCConstraint = () => (
  <Track
    renderLeftPanel={() => (
      <SidePanel>
        <span>Regional missense constraint</span>
        <InfoButton topic="regional-constraint" />
      </SidePanel>
    )}
  >
    {({ width }: { width: number }) => (
      <>
        <PlotWrapper>
          <svg height={35} width={width}>
            <text x={width / 2} y={35 / 2} dy="1.0rem" textAnchor="middle">
              <tspan>
                This gene was not searched for evidence of regional missense constraint. See our{' '}
              </tspan>
              <tspan fill="#0000ff">
                <Link to="/help">help page</Link>
              </tspan>
              <tspan> for additional information.</tspan>
            </text>
          </svg>
        </PlotWrapper>
      </>
    )}
  </Track>
)

const RegionalMissenseConstraintTrack = ({ regionalMissenseConstraint, gene }: Props) => {
  if (
    !regionalMissenseConstraint ||
    regionalMissenseConstraint.regions === null ||
    (regionalMissenseConstraint.passed_qc === false &&
      regionalMissenseConstraint.has_no_rmc_evidence === false)
  ) {
    return <NoRMCConstraint />
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
        },
      ]
    }
  }

  const constraintInCodingSections = regionsInExons(
    regionalMissenseConstraint.regions,
    gene.exons.filter((exon) => exon.feature_type === 'CDS')
  )

  return (
    <ConstraintTrack
      trackTitle="Regional missense constraint"
      allRegions={regionalMissenseConstraint.regions}
      constrainedRegions={constraintInCodingSections}
      infobuttonTopic="regional-constraint"
      colorFn={regionColor}
      legend={<Legend />}
      tooltipComponent={RegionTooltip}
      valueFn={formattedOE}
    />
  )
}

RegionalMissenseConstraintTrack.defaultProps = {
  height: 15,
}

export default RegionalMissenseConstraintTrack
