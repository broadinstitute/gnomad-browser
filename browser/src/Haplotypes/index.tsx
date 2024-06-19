import React from 'react'
import styled from 'styled-components'

import queryString from 'query-string'

// @ts-expect-error
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import Link from '../Link'

import InfoButton from '../help/InfoButton'

import haplotypeGroups from '/Users/msolomon/code/karyogram/datasets/long-read/data/2024-06-19/afewgenes/haplotype_groups-e79fd160-0b06-42ae-9241-057ef74b7974.json'

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

export function regionColor(region: { num_samples: number }) {
  // Use a colorblind-friendly scheme from ColorBrewer: https://colorbrewer2.org/#type=sequential&scheme=PuOr&n=3
  if (region.num_samples > 8) {
    return '#b35806' // Dark orange
  } else if (region.num_samples > 4) {
    return '#f1a340' // Light orange
  } else {
    return '#fee0b6' // Very light orange
  }
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
    {`The sample count ranges from 0 to 100. Sample count > 40 (red) and sample count > 20 (yellow) represent regions with more samples.`}
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
            <rect x={10} y={0} width={2} height={20} fill='#000' />
          </svg>
        </>
      )}
      <span>
        Allele count{' '}
        <TooltipAnchor key='Legend' tooltipComponent={LegendTooltip}>
          <img src={QuestionMarkIcon} height='12' alt='' aria-hidden='true' />
        </TooltipAnchor>
      </span>
      <svg width={330} height={25}>
        <text x={70} y={-4} fontSize='10' dy='1.2em'>
          Rare
        </text>
        <rect x={95} y={0} width={40} height={10} stroke='#000' fill='#e2e2e2' />
        <rect x={135} y={0} width={40} height={10} stroke='#000' fill='#ffeda0' />
        <rect x={175} y={0} width={40} height={10} stroke='#000' fill='#f03b20' />
        <text x={220} y={-4} fontSize='10' dy='1.2em'>
          Common
        </text>
        <text x={110} y={10} fontSize='10' dy='1.2em' textAnchor='middle' />
        <text x={135} y={10} fontSize='10' dy='1.2em' textAnchor='middle'>
          20
        </text>
        <text x={175} y={10} fontSize='10' dy='1.2em' textAnchor='middle'>
          40
        </text>
      </svg>
    </LegendWrapper>
  )
}

const renderNumber = (number: number | null | undefined) =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

type RegionTooltipProps = {
  region: {
    haplotype_id: number
    start: string
    stop: string
    size_bp: number
    num_samples: number
    phased: boolean
    ploidy: number
  }
}

const RegionTooltip = ({ region }: RegionTooltipProps) => (
  <RegionAttributeList>
    <div>
      <dt>Haplotype ID:</dt>
      <dd>{region.haplotype_id}</dd>
    </div>
    <div>
      <dt>Start:</dt>
      <dd>{region.start}</dd>
    </div>
    <div>
      <dt>Stop:</dt>
      <dd>{region.stop}</dd>
    </div>
    <div>
      <dt>Phased:</dt>
      <dd>{region.phased ? 'Yes' : 'No'}</dd>
    </div>
    <div>
      <dt>Ploidy:</dt>
      <dd>{region.ploidy}</dd>
    </div>
    <div>
      <dt>Size:</dt>
      <dd>{region.size_bp} BP</dd>
    </div>
    <div>
      <dt>Number of Samples:</dt>
      <dd>{region.num_samples}</dd>
    </div>
  </RegionAttributeList>
)

const renderTrackLeftPanel = () => {
  return (
    <SidePanel>
      <span>{`Long Read Haplotypes`}</span>
      <InfoButton topic='haplotypes' />
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

type OwnRegionalConstraintTrackProps = {
  height?: number
  start: number
  stop: number
  regions: any[] | null
}

const HaplotypeTrack = ({ height, start, stop, regions }: typeof HaplotypeTrack.defaultProps) => {
  if (regions === null) {
    return (
      <Wrapper>
        <Track renderLeftPanel={renderTrackLeftPanel}>
          {({ width }: { width: number }) => (
            <>
              <PlotWrapper>
                <svg height={height} width={width}>
                  <text x={width / 2} y={height / 2} dy='0.33rem' textAnchor='middle'>
                    {`There is no haplotype data for this region`}
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
      <Track renderLeftPanel={renderTrackLeftPanel}>
        {({ scalePosition, width }: TrackProps) => {
          const rows: Array<Array<any>> = [[]]

          haplotypeGroups.groups.forEach((group: any) => {
            const startX = scalePosition(group.start)
            const stopX = scalePosition(group.stop)
            const groupWidth = stopX - startX

            let placed = false

            // Find a row where the group can be placed without overlapping
            for (const row of rows) {
              if (row.length === 0 || scalePosition(row[row.length - 1].stop) + 1 < startX) {
                // adjusted to avoid touching
                row.push(group)
                placed = true
                break
              }
            }

            // If no row was found, create a new row
            if (!placed) {
              rows.push([group])
            }
          })

          return (
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
                    fill='#000'
                  />
                  {typeof variantId === 'string' && (
                    <>
                      <rect
                        x={scalePosition(variantId.split('-')[1])}
                        y={15}
                        width={2}
                        height={30}
                        fill='#000'
                      />
                      <text
                        x={scalePosition(variantId.split('-')[1])}
                        y={9}
                        dy='0.33rem'
                        textAnchor='middle'
                      >
                        <Link to={`/variant/${variantId}`}>{variantId}</Link>
                      </text>
                    </>
                  )}
                  {rows.map((row, rowIndex) =>
                    row.map((group: any) => {
                      const startX = scalePosition(group.start)
                      const stopX = scalePosition(group.stop)
                      const groupWidth = stopX - startX

                      return (
                        <TooltipAnchor
                          key={`group-${group.start}-${group.stop}`}
                          tooltipComponent={() => <RegionTooltip region={group} />}
                        >
                          <g>
                            {group.size_bp === 0 ? (
                              <circle
                                cx={(startX + stopX) / 2}
                                cy={30 + rowIndex * 20}
                                r={1}
                                fill={regionColor(group)}
                                stroke='black'
                              />
                            ) : (
                              <rect
                                x={startX}
                                y={22.5 + rowIndex * 20}
                                width={groupWidth}
                                height={15}
                                fill={regionColor(group)}
                                stroke='black'
                              />
                            )}
                          </g>
                        </TooltipAnchor>
                      )
                    })
                  )}
                </svg>
              </PlotWrapper>
            </>
          )
        }}
      </Track>
    </Wrapper>
  )
}

HaplotypeTrack.defaultProps = {
  height: 1000,
}

export default HaplotypeTrack
