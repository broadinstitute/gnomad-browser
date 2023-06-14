import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
import { ExternalLink, TooltipAnchor } from '@gnomad/ui'

import InfoButton from './help/InfoButton'

export const regionIntersections = (regionArrays: any) => {
  const sortedRegionsArrays = regionArrays.map((regions: any) =>
    [...regions].sort((a, b) => a.start - b.start)
  )

  const intersections = []

  const indices = sortedRegionsArrays.map(() => 0)

  while (sortedRegionsArrays.every((regions: any, i: any) => indices[i] < regions.length)) {
    const maxStart = Math.max(
      ...sortedRegionsArrays.map((regions: any, i: any) => regions[indices[i]].start)
    )
    const minStop = Math.min(
      ...sortedRegionsArrays.map((regions: any, i: any) => regions[indices[i]].stop)
    )

    if (maxStart < minStop) {
      const next = Object.assign(
        ...[
          {},
          ...sortedRegionsArrays.map(
            (regions: { [x: string]: any }, i: string | number) => regions[indices[i]]
          ),
          {
            start: maxStart,
            stop: minStop,
          },
        ]
      )

      intersections.push(next)
    }

    sortedRegionsArrays.forEach((regions: any, i: any) => {
      if (regions[indices[i]].stop === minStop) {
        indices[i] += 1
      }
    })
  }

  return intersections
}

const Wrapper = styled.div`
  display: flex;
  margin-bottom: 1em;
`

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
`

const RegionAttributeList = styled.dl`
  margin: 0;

  div {
    margin-bottom: 0.25em;
  }

  dt {
    display: inline;
    font-weight: bold;
  }

  dd {
    display: inline;
    margin-left: 0.5em;
  }
`

// https://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=5
const colorScale = {
  not_significant: '#e2e2e2',
  least: '#bd0026',
  less: '#f03b20',
  middle: '#fd8d3c',
  greater: '#fecc5c',
  greatest: '#ffffb2',
}

function regionColor(region: ConstraintRegion) {
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

  return region.chisq_diff_null < 10.8 ? colorScale.not_significant : color
}

const LegendWrapper = styled.div`
  display: flex;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }
`

const Legend = () => {
  return (
    <LegendWrapper>
      <span>Observed / Expected</span>
      <svg width={170} height={25}>
        <rect x={10} y={0} width={30} height={10} stroke="#000" fill={colorScale.least} />
        <rect x={40} y={0} width={30} height={10} stroke="#000" fill={colorScale.less} />
        <rect x={70} y={0} width={30} height={10} stroke="#000" fill={colorScale.middle} />
        <rect x={100} y={0} width={30} height={10} stroke="#000" fill={colorScale.greater} />
        <rect x={130} y={0} width={30} height={10} stroke="#000" fill={colorScale.greatest} />
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
          1.0
        </text>
      </svg>
      <svg width={170} height={25}>
        <rect x={10} y={0} width={20} height={10} stroke="#000" fill={colorScale.not_significant} />
        <text x={35} y={0} fontSize="10" dy="1em" textAnchor="start">
          Not significant ({'\u03a7\u00b2'} &lt; 10.8)
        </text>
      </svg>
    </LegendWrapper>
  )
}

const renderNumber = (number: any) =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

type ConstraintRegion = {
  start: number
  stop: number
  obs_exp: number
  obs_mis: number
  exp_mis: number
  chisq_diff_null: number
}

type RegionTooltipProps = {
  region: ConstraintRegion
  gene: {
    chrom: number
  }
  isTranscript: boolean
}

const RegionTooltip = ({ region, gene, isTranscript }: RegionTooltipProps) => {
  if (isTranscript) {
    return (
      <RegionAttributeList>
        <div>
          <dt>O/E missense:</dt>
          <dd>{renderNumber(region.obs_exp)}</dd>
        </div>
        <br />
        <div>The observed/expected ratio for this gene is transcript wide.</div>
      </RegionAttributeList>
    )
  } else {
    return (
      <RegionAttributeList>
        <div>
          <dt>O/E missense:</dt>
          <dd>{renderNumber(region.obs_exp)}</dd>
        </div>
        <div>
          <dt>Observed:</dt>
          <dd>{region.obs_mis}</dd>
        </div>
        <div>
          <dt>Expected:</dt>
          <dd>{renderNumber(region.exp_mis)}</dd>
        </div>
        <div>
          <dt>
            &chi;
            <sup>2</sup>:
          </dt>
          <dd>
            {renderNumber(region.chisq_diff_null)}
            {region.chisq_diff_null !== null &&
              region.chisq_diff_null < 10.8 &&
              ' (not significant)'}
          </dd>
        </div>
        <div>
          <dt>Region start locus:</dt>
          {/* TODO: UPDATE TO GET REAL CHROM INFO */}
          <dd>{`${gene.chrom}-${region.start}`}</dd>
        </div>
        <div>
          <dt>Region start amino acid number:</dt>
          <dd>{`{{ -5 }}`}</dd>
        </div>
        <div>
          <dt>Region stop locus:</dt>
          {/* TODO: UPDATE TO GET REAL CHROM INFO */}
          <dd>{`${gene.chrom}-${region.stop}`}</dd>
        </div>
        <div>
          <dt>Region stop amino acid number:</dt>
          <dd>{`{{ -5 }}`}</dd>
        </div>
      </RegionAttributeList>
    )
  }
}

const SidePanel = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
`

const TopPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-bottom: 5px;
`

type OwnRegionalConstraintTrackProps = {
  height?: number
  regions: {
    start: number
    stop: number
    obs_exp: number
    chisq_diff_null: number
  }[]
}

type RegionalConstraintTrack = {
  constrainedRegions: ConstraintRegion[]
  geneInfo: {
    chrom: string
    start: number
    stop: number
    oe_mis: number | null
    obs_mis: number | null
    exp_mis: number | null
  }
  exons: {
    // TODO: import from elsewhere?
    feature_type: string
    start: number
    stop: number
  }
  label: string
  includeLegend: boolean
}

// type RegionalConstraintTrackProps = OwnRegionalConstraintTrackProps &
//   typeof RegionalConstraintTrack.defaultProps

const RegionalConstraintTrack = ({
  constrainedRegions,
  geneInfo,
  exons,
  label,
  includeLegend,
}: any) => {
  // TODO: the way you'd abstract this is:
  //  - you make some type of `svg` and call it 'content'
  //      then you can conditioanlly set the SVG based on the 3 cases
  //      and just render {content} in the return statement

  // TODO: This is legit hardcoded to PCSK4 - change this to if not found (if constrainedRegions is null)
  if (geneInfo.start === 1481427 && geneInfo.stop === 1490751) {
    return (
      <Track
        renderLeftPanel={() => (
          <SidePanel>
            {label && <span>{label}</span>}
            {!label && <span>Regional missense constraint</span>}
            <InfoButton topic="regional-constraint" />
          </SidePanel>
        )}
      >
        {({ scalePosition, width }: any) => (
          <>
            <PlotWrapper>
              <svg height={35} width={width}>
                <text x={width / 2} y={35 / 2} dy="1.0rem" textAnchor="middle">
                  <tspan>This gene was not searched for RMC. See the </tspan>
                  <tspan fill="#0000ff">
                    {/* @ts-expect-error - gnomad-browser-toolkit */}
                    <ExternalLink href={`https://gnomad.broadinstitute.org`}>
                      v2 RMC blog post
                    </ExternalLink>
                  </tspan>
                  <tspan> for addtional information.</tspan>
                </text>
              </svg>
            </PlotWrapper>
          </>
        )}
      </Track>
    )
  }

  // If this prop was passed, RMC was not run for this gene, use the gene level
  //   constraint data to display info
  if (!constrainedRegions) {
    constrainedRegions = [
      {
        start: geneInfo.start,
        stop: geneInfo.stop,
        // TODO: this is bad - gnomad_constraint can be null!
        obs_exp: geneInfo.oe_mis,
        obs_mis: geneInfo.obs_mis,
        exp_mis: geneInfo.exp_mis,
        chisq_diff_null: 13, // TODO: this is bad also, think about this logic
      },
    ]
  }

  const constrainedExons = regionIntersections([
    constrainedRegions,
    exons.filter((exon: any) => exon.feature_type === 'CDS'),
  ])

  return (
    <Wrapper>
      <Track
        renderLeftPanel={() => (
          <SidePanel>
            {/* <span>Regional missense constraint</span> */}
            {label && <span>{label}</span>}
            {!label && <span>Regional missense constraint</span>}
            <InfoButton topic="regional-constraint" />
          </SidePanel>
        )}
      >
        {({ scalePosition, width }: any) => (
          <>
            <TopPanel>{includeLegend && <Legend />}</TopPanel>
            <PlotWrapper>
              <svg height={35} width={width}>
                {constrainedExons.map((region: ConstraintRegion) => {
                  const startX = scalePosition(region.start)
                  const stopX = scalePosition(region.stop)
                  const regionWidth = stopX - startX

                  return (
                    <TooltipAnchor
                      key={`${region.start}-${region.stop}`}
                      // @ts-expect-error
                      region={region}
                      gene={geneInfo}
                      isTranscript={constrainedRegions.length === 1}
                      tooltipComponent={RegionTooltip}
                    >
                      <g>
                        <rect
                          x={startX}
                          y={0}
                          width={regionWidth}
                          height={15}
                          fill={regionColor(region)}
                          stroke="black"
                        />
                      </g>
                    </TooltipAnchor>
                  )
                })}
                <g transform="translate(0,20)">
                  {constrainedRegions.map((region: any) => {
                    const startX = scalePosition(region.start)
                    const stopX = scalePosition(region.stop)
                    const regionWidth = stopX - startX
                    const midX = (startX + stopX) / 2

                    return (
                      <g key={`${region.start}-${region.stop}`}>
                        <line x1={startX} y1={2} x2={startX} y2={11} stroke="#424242" />
                        <line x1={startX} y1={7} x2={stopX} y2={7} stroke="#424242" />
                        <line x1={stopX} y1={2} x2={stopX} y2={11} stroke="#424242" />
                        {regionWidth > 40 && (
                          <>
                            <rect x={midX - 15} y={3} width={30} height={5} fill="#fafafa" />
                            <text x={midX} y={8} dy="0.33em" textAnchor="middle">
                              {region.obs_exp.toFixed(2)}
                            </text>
                          </>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </PlotWrapper>
          </>
        )}
      </Track>
    </Wrapper>
  )
}

RegionalConstraintTrack.defaultProps = {
  height: 15,
}

export default RegionalConstraintTrack
