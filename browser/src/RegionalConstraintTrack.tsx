import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'

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
        // @ts-expect-error
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

// TODO:TODO:FIXME: (rgrant, Apr 25 2023: old color scale)
// const colorScale = {
//   "not_significant": "#e2e2e2",
//   "least": "#d7191c",
//   "less": "#fdae61",
//   "middle": "#ffffbf",
//   "greater": "#abdda4",
//   "greatest": "#2b83ba",
// }

// TODO: temp Using Nick's preferred site for color scale - Blue? Maybe bad
// https://colorbrewer2.org/#type=sequential&scheme=PuBu&n=5
// const colorScale = {
//   not_significant: '#e2e2e2',
//   least: '#045a8d',
//   less: '#2b8cbe',
//   middle: '#74a9cf',
//   greater: '#bdc9e1',
//   greatest: '#f1eef6',
// }

// TODO: temp Using Nick's preferred site for color scale - Red/Yellow
// https://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=5
const colorScale = {
  // not_significant: '#b2b2b2',
  not_significant: '#e2e2e2',
  least: '#bd0026',
  less: '#f03b20',
  middle: '#fd8d3c',
  greater: '#fecc5c',
  greatest: '#ffffb2',
}

// TODO: temp Using Lily's color scale
// const colorScale = {
//   not_significant: '#e2e2e2',
//   least: '#A50F15',
//   less: '#DE2D26',
//   middle: '#FB6A4A',
//   greater: '#FCAE91',
//   greatest: '#FEE5D9',
// }

function regionColor(region: any) {
  // http://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=3
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

type RegionTooltipProps = {
  region: {
    obs_exp?: number
    chisq_diff_null?: number
    start: number
    stop: number
  }
}

const RegionTooltip = ({ region }: RegionTooltipProps) => (
  <RegionAttributeList>
    <div>
      <dt>O/E missense:</dt>
      <dd>{renderNumber(region.obs_exp)}</dd>
    </div>
    <div>
      <dt>
        &chi;
        <sup>2</sup>:
      </dt>
      <dd>
        {renderNumber(region.chisq_diff_null)}
        {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
        {region.chisq_diff_null !== null && region.chisq_diff_null < 10.8 && ' (not significant)'}
      </dd>
    </div>
    <div>
      <dt>Break start:</dt>
      {/* TODO: UPDATE TO GET REAL CHROM INFO */}
      <dd>{`12-${region.start}-G`}</dd>
    </div>
    <div>
      <dt>Break stop:</dt>
      {/* TODO: UPDATE TO GET REAL CHROM INFO */}
      <dd>{`12-${region.stop}-A`}</dd>
    </div>
  </RegionAttributeList>
)

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

// type RegionalConstraintTrackProps = OwnRegionalConstraintTrackProps &
//   typeof RegionalConstraintTrack.defaultProps

const RegionalConstraintTrack = ({ constrainedRegions, exons, label, includeLegend }: any) => {
  // TODO:FIXME: Temp for mockups
  // if (!constrainedRegions) {
  //   return (
  //     <Wrapper>
  //       <Track
  //         renderLeftPanel={() => (
  //           <SidePanel>
  //             {label && <span>{label}</span>}
  //             {!label && <span>Regional missense constraint</span>}
  //             <InfoButton topic="regional-constraint" />
  //           </SidePanel>
  //         )}
  //       >
  //         {({ scalePosition, width }: any) => (
  //           <>
  //             <PlotWrapper>
  //               <svg height={35} width={width}>
  //                 <text x={width / 2} y={35 / 2} dy="0.33rem" textAnchor="middle">
  //                   {`This gene was not searched for regional missense constraint, see the help text for additional information.`}
  //                 </text>
  //               </svg>
  //             </PlotWrapper>
  //           </>
  //         )}
  //       </Track>
  //     </Wrapper>
  //   )
  // }

  // TODO:FIXME: Temp for mockups
  // if (constrainedRegions.length === 1) {
  //   return <p>TODO: There's only 1!!!</p>
  // }

  //gnomad.broadinstitute.org/region/1-55505221-55530525

  // TODO: FIXME: legit hardcoded this
  if (!constrainedRegions) {
    constrainedRegions = [{ start: 55505221, stop: 55530525, obs_exp: 0.96, chisq_diff_null: 0.5 }]
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
                {constrainedExons.map((region: any) => {
                  const startX = scalePosition(region.start)
                  const stopX = scalePosition(region.stop)
                  const regionWidth = stopX - startX

                  return (
                    <TooltipAnchor
                      key={`${region.start}-${region.stop}`}
                      // @ts-expect-error
                      region={region}
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
