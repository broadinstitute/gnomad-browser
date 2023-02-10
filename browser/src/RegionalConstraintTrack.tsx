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

function regionColor(region: any) {
  // http://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=3
  let color
  if (region.obs_exp > 0.8) {
    color = '#2b83ba'
  } else if (region.obs_exp > 0.6) {
    color = '#abdda4'
  } else if (region.obs_exp > 0.4) {
    color = '#ffffbf'
  } else if (region.obs_exp > 0.2) {
    color = '#fdae61'
  } else {
    color = '#d7191c'
  }

  return region.chisq_diff_null < 10.8 ? '#e2e2e2' : color
}

const renderNumber = (number: any) =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

type RegionTooltipProps = {
  region: {
    obs_exp?: number
    chisq_diff_null?: number
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
  </RegionAttributeList>
)

const SidePanel = styled.div`
  display: flex;
  align-items: center;
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

const RegionalConstraintTrack = ({ constrainedRegions, exons }: any) => {
  const constrainedExons = regionIntersections([
    constrainedRegions,
    exons.filter((exon: any) => exon.feature_type === 'CDS'),
  ])

  return (
    <Wrapper>
      <Track
        renderLeftPanel={() => (
          <SidePanel>
            <span>Regional missense constraint</span>
            <InfoButton topic="regional-constraint" />
          </SidePanel>
        )}
      >
        {({ scalePosition, width }: any) => (
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
                      <line x1={startX} y1={7} x2={midX - 15} y2={7} stroke="#424242" />
                      <line x1={midX + 15} y1={7} x2={stopX} y2={7} stroke="#424242" />
                      <line x1={stopX} y1={2} x2={stopX} y2={11} stroke="#424242" />
                      {regionWidth > 30 && (
                        <text x={midX} y={8} dy="0.33em" textAnchor="middle">
                          {region.obs_exp.toFixed(2)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            </svg>
          </PlotWrapper>
        )}
      </Track>
    </Wrapper>
  )
}

RegionalConstraintTrack.defaultProps = {
  height: 15,
}

export default RegionalConstraintTrack
