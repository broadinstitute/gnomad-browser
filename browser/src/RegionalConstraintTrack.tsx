import { transparentize } from 'polished'
import React from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'

import InfoButton from './help/InfoButton'

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
  if (region.obs_exp > 0.6) {
    color = '#e2e2e2'
  } else if (region.obs_exp > 0.4) {
    color = '#ffeda0'
  } else if (region.obs_exp > 0.2) {
    color = '#feb24c'
  } else {
    color = '#f03b20'
  }

  return region.chisq_diff_null < 10.8 ? transparentize(0.8, color) : color
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

// @ts-expect-error TS(2456) FIXME: Type alias 'RegionalConstraintTrackProps' circular... Remove this comment to see the full error message
type RegionalConstraintTrackProps = OwnRegionalConstraintTrackProps &
  typeof RegionalConstraintTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'RegionalConstraintTrack' implicitly has type 'any... Remove this comment to see the full error message
const RegionalConstraintTrack = ({ height, regions }: RegionalConstraintTrackProps) => (
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
          <svg height={height} width={width}>
            {regions.map((region: any) => {
              const startX = scalePosition(region.start)
              const stopX = scalePosition(region.stop)
              const regionWidth = stopX - startX

              return (
                <TooltipAnchor
                  key={`${region.start}-${region.stop}`}
                  // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; key: string; region: an... Remove this comment to see the full error message
                  region={region}
                  tooltipComponent={RegionTooltip}
                >
                  <g>
                    <rect
                      x={startX}
                      y={0}
                      width={regionWidth}
                      height={height}
                      fill={regionColor(region)}
                      stroke="black"
                    />
                    {regionWidth > 30 && (
                      <text x={(startX + stopX) / 2} y={height / 2} dy="0.33em" textAnchor="middle">
                        {region.obs_exp.toFixed(2)}
                      </text>
                    )}
                  </g>
                </TooltipAnchor>
              )
            })}
          </svg>
        </PlotWrapper>
      )}
    </Track>
  </Wrapper>
)

RegionalConstraintTrack.defaultProps = {
  height: 15,
}

export default RegionalConstraintTrack
