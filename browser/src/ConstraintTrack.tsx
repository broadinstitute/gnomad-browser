import React, { ReactNode } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import InfoButton from './help/InfoButton'
import { TooltipAnchor } from '@gnomad/ui'
import { Exon } from './TranscriptPage/TranscriptPage'

export const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
`

type TrackProps = {
  scalePosition: (input: number) => number
  width: number
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1em;
`

export const SidePanel = styled.div`
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

const LegendWrapper = styled.div`
  display: flex;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }
`

export const RegionAttributeList = styled.dl`
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

export interface GenericRegion {
  start: number
  stop: number
}

// When clamping constrained regions to exons, we remember the original
// boundaries of the region for display in the region tooltip
export type RegionWithUnclamped<R extends GenericRegion> = R & {
  unclamped_start: number
  unclamped_stop: number
}

type Props<R extends GenericRegion> = {
  trackTitle: string
  allRegions: R[] | null
  constrainedRegions: RegionWithUnclamped<R>[]
  infobuttonTopic: string
  legend: ReactNode
  tooltipComponent: React.ElementType
  colorFn: (region: R) => string
  valueFn: (region: R) => string
}

export const regionsInExons = <R extends GenericRegion>(
  regions: R[],
  exons: Exon[]
): RegionWithUnclamped<R>[] => {
  const sortedRegions = regions.sort((a, b) => a.start - b.start)
  const sortedExons = exons.sort((a, b) => a.start - b.start)

  const intersections = []

  let regionIndex = 0
  let exonIndex = 0

  while (regionIndex < regions.length && exonIndex < exons.length) {
    const region = sortedRegions[regionIndex]
    const exon = sortedExons[exonIndex]
    const maxStart = Math.max(region.start, exon.start)
    const minStop = Math.min(region.stop, exon.stop)

    if (maxStart < minStop) {
      const next: RegionWithUnclamped<R> = {
        ...region,
        start: maxStart,
        stop: minStop,
        unclamped_start: region.start,
        unclamped_stop: region.stop,
      }
      intersections.push(next)
    }

    if (region.stop === minStop) {
      regionIndex += 1
    }
    if (exon.stop === minStop) {
      exonIndex += 1
    }
  }
  return intersections
}

const ConstraintTrack = <R extends GenericRegion>({
  trackTitle,
  allRegions,
  constrainedRegions,
  infobuttonTopic,
  legend,
  tooltipComponent,
  colorFn,
  valueFn,
}: Props<R>) => (
  <Wrapper>
    <Track
      renderLeftPanel={() => (
        <SidePanel>
          <span>{trackTitle}</span>
          <InfoButton topic={infobuttonTopic} />
        </SidePanel>
      )}
    >
      {({ scalePosition, width }: TrackProps) => (
        <>
          <TopPanel>
            <LegendWrapper>{legend}</LegendWrapper>
          </TopPanel>
          <PlotWrapper>
            <svg height={55} width={width}>
              {!allRegions && <rect x={0} y={7.5} width={width} height={1} />}
              {constrainedRegions.map((region: RegionWithUnclamped<R>) => {
                const startX = scalePosition(region.start)
                const stopX = scalePosition(region.stop)
                const regionWidth = stopX - startX

                return (
                  <TooltipAnchor
                    key={`${region.start}-${region.stop}`}
                    // @ts-expect-error need to redefine TooltipAnchor to allow arbitrary props for the children type-safely
                    region={region}
                    isTranscript={allRegions && allRegions.length === 1}
                    tooltipComponent={tooltipComponent}
                  >
                    <g>
                      <rect
                        x={startX}
                        y={1}
                        width={regionWidth}
                        height={15}
                        fill={colorFn(region)}
                        stroke="black"
                      />
                    </g>
                  </TooltipAnchor>
                )
              })}
              {allRegions && (
                <g transform="translate(0,20)">
                  {allRegions.map((region: R, index: number) => {
                    const startX = scalePosition(region.start)
                    const stopX = scalePosition(region.stop)
                    const regionWidth = stopX - startX
                    const midX = (startX + stopX) / 2
                    const offset = index * 0

                    return (
                      <g key={`${region.start}-${region.stop}`}>
                        <line
                          x1={startX}
                          y1={2 + offset}
                          x2={startX}
                          y2={11 + offset}
                          stroke="#424242"
                        />
                        <line
                          x1={startX}
                          y1={7 + offset}
                          x2={stopX}
                          y2={7 + offset}
                          stroke="#424242"
                        />
                        <line
                          x1={stopX}
                          y1={2 + offset}
                          x2={stopX}
                          y2={11 + offset}
                          stroke="#424242"
                        />
                        {regionWidth > 40 && (
                          <>
                            <rect
                              x={midX - 15}
                              y={3 + offset}
                              width={30}
                              height={5}
                              fill="#fafafa"
                            />
                            <text x={midX} y={8 + offset} dy="0.33em" textAnchor="middle">
                              {valueFn(region)}
                            </text>
                          </>
                        )}
                      </g>
                    )
                  })}
                </g>
              )}
            </svg>
          </PlotWrapper>
        </>
      )}
    </Track>
  </Wrapper>
)

export default ConstraintTrack
