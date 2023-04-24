import React from 'react'
import styled from 'styled-components'

import queryString from 'query-string'

// @ts-expect-error
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import Link from './Link'

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

export function regionColor(region: any) {
  // http://colorbrewer2.org/#type=sequential&scheme=YlOrRd&n=3
  let color
  if (region.z > 4.0) {
    color = '#f03b20'
  } else if (region.z > 2.18) {
    color = '#ffeda0'
  } else {
    color = '#e2e2e2'
  }
  return color
}

const LegendWrapper = styled.div`
  display: flex;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }
`

const LegendTooltip = () => (
  <>
    {`The Z score ranges from -10 to 10. Z >= 2.18 (yellow) and Z >= 4.0 (red) represent the top 10% and top 1% of constrained non-coding regions, respectively.`}
  </>
)

export const Legend = () => {
  const currentParams = queryString.parse(location.search)

  return (
    <LegendWrapper>
      {currentParams.variant && (
        <>
          <span>Selected Variant</span>
          <svg width={40} height={25}>
            <rect x={10} y={0} width={2} height={20} fill="#000" />
          </svg>
        </>
      )}
      <span>
        Z Score{' '}
        <TooltipAnchor key="Legend" tooltipComponent={LegendTooltip}>
          <img src={QuestionMarkIcon} height="12" alt="" aria-hidden="true" />
        </TooltipAnchor>
      </span>
      <svg width={330} height={25}>
        <text x={15} y={-4} fontSize="10" dy="1.2em">
          not constrained
        </text>
        <rect x={95} y={0} width={40} height={10} stroke="#000" fill="#e2e2e2" />
        <rect x={135} y={0} width={40} height={10} stroke="#000" fill="#ffeda0" />
        <rect x={175} y={0} width={40} height={10} stroke="#000" fill="#f03b20" />
        <text x={220} y={-4} fontSize="10" dy="1.2em">
          constrained
        </text>
        <text x={110} y={10} fontSize="10" dy="1.2em" textAnchor="middle" />
        <text x={135} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          2.18
        </text>
        <text x={175} y={10} fontSize="10" dy="1.2em" textAnchor="middle">
          4.0
        </text>
      </svg>
    </LegendWrapper>
  )
}

const renderNumber = (number: number | null | undefined) =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

type RegionTooltipProps = {
  region: {
    z: number
    obs_exp: number
  }
}

const RegionTooltip = ({ region }: RegionTooltipProps) => (
  <RegionAttributeList>
    <div>
      <dt>Z:</dt>
      <dd>{renderNumber(region.z)}</dd>
    </div>
    <div>
      <dt>o/e:</dt>
      <dd>{renderNumber(region.obs_exp)}</dd>
    </div>
  </RegionAttributeList>
)

const renderTrackLeftPanel = (constraintWidth: number) => {
  return (
    <SidePanel>
      <span>{`Regional genomic constraint (${constraintWidth / 1000}kb scale)`}</span>
      <InfoButton topic="genomic-constraint" />
    </SidePanel>
  )
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

type TrackProps = {
  scalePosition: (input: string) => number
  width: number
}

type Region = {
  start: number
  stop: number
  z: number
}

type OwnRegionalConstraintTrackProps = {
  height?: number
  start: number
  stop: number
  regions: Region[] | null
}

// @ts-expect-error TS(2456) FIXME: Type alias 'RegionalConstraintTrackProps' circular... Remove this comment to see the full error message
type RegionalConstraintTrackProps = OwnRegionalConstraintTrackProps &
  typeof RegionalGenomicConstraintTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'RegionalConstraintTrack' implicitly has type 'any... Remove this comment to see the full error message
const RegionalGenomicConstraintTrack = ({
  height,
  start,
  stop,
  regions,
}: RegionalConstraintTrackProps) => {
  const returnConstraintsThreshold = 150_000
  const constraintRegionSize = 1_000

  if (regions === null) {
    return (
      <Wrapper>
        <Track renderLeftPanel={() => renderTrackLeftPanel(constraintRegionSize)}>
          {({ width }: { width: number }) => (
            <>
              <PlotWrapper>
                <svg height={height} width={width}>
                  <text x={width / 2} y={height / 2} dy="0.33rem" textAnchor="middle">
                    {stop - start > returnConstraintsThreshold &&
                      `The genomic constraint track is only displayed for regions with a size of ${
                        returnConstraintsThreshold / 1000
                      }kb or smaller. Zoom in or adjust the region to see this track.`}
                    {stop - start <= returnConstraintsThreshold &&
                      `There is no genomic constraint data for this region`}
                  </text>
                </svg>
              </PlotWrapper>
            </>
          )}
        </Track>
      </Wrapper>
    )
  }

  const currentParams = queryString.parse(location.search)
  const variantId = currentParams.variant

  return (
    <Wrapper>
      <Track renderLeftPanel={() => renderTrackLeftPanel(constraintRegionSize)}>
        {({ scalePosition, width }: TrackProps) => (
          <>
            <TopPanel>
              <Legend />
            </TopPanel>
            <PlotWrapper>
              <svg height={height} width={width}>
                <rect
                  x={scalePosition(start)}
                  y={30}
                  width={scalePosition(stop) - scalePosition(start)}
                  height={1}
                  fill="#000"
                />
                {typeof variantId === 'string' && (
                  <>
                    <rect
                      x={scalePosition(variantId.split('-')[1])}
                      y={15}
                      width={2}
                      height={30}
                      fill="#000"
                    />
                    <text
                      x={scalePosition(variantId.split('-')[1])}
                      y={9}
                      dy="0.33rem"
                      textAnchor="middle"
                    >
                      <Link to={`/variant/${variantId}`}>{variantId}</Link>
                    </text>
                  </>
                )}
                {regions.map((region: Region) => {
                  const startX = scalePosition(region.start.toString())
                  const stopX = scalePosition(region.stop.toString())
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
                          y={22.5}
                          width={regionWidth}
                          height={15}
                          fill={regionColor(region)}
                          stroke="black"
                        />
                        {regionWidth > 32 && (
                          <text x={(startX + stopX) / 2} y={30} dy="0.33em" textAnchor="middle">
                            {region.z.toFixed(2)}
                          </text>
                        )}
                      </g>
                    </TooltipAnchor>
                  )
                })}
              </svg>
            </PlotWrapper>
          </>
        )}
      </Track>
    </Wrapper>
  )
}

RegionalGenomicConstraintTrack.defaultProps = {
  height: 45,
}

export default RegionalGenomicConstraintTrack
