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

import haplotypeBlocks from '/Users/msolomon/code/karyogram/datasets/long-read/data/2024-06-18/haplotype_blocks.json'

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
  if (region.num_samples > 40) {
    color = '#f03b20'
  } else if (region.num_samples > 20) {
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
        Frequency{' '}
        <TooltipAnchor key='Legend' tooltipComponent={LegendTooltip}>
          <img src={QuestionMarkIcon} height='12' alt='' aria-hidden='true' />
        </TooltipAnchor>
      </span>
      <svg width={330} height={25}>
        <text x={15} y={-4} fontSize='10' dy='1.2em'>
          Low
        </text>
        <rect x={95} y={0} width={40} height={10} stroke='#000' fill='#e2e2e2' />
        <rect x={135} y={0} width={40} height={10} stroke='#000' fill='#ffeda0' />
        <rect x={175} y={0} width={40} height={10} stroke='#000' fill='#f03b20' />
        <text x={220} y={-4} fontSize='10' dy='1.2em'>
          High
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
    haplotype: {
      alleles: number[]
      phased: boolean
      ploidy: number
    }
    size: number
    num_samples: number
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
      <dt>Alleles:</dt>
      <dd>{region.haplotype.alleles.join('/')}</dd>
    </div>
    <div>
      <dt>Phased:</dt>
      <dd>{region.haplotype.phased ? 'Yes' : 'No'}</dd>
    </div>
    <div>
      <dt>Ploidy:</dt>
      <dd>{region.haplotype.ploidy}</dd>
    </div>
    <div>
      <dt>Size:</dt>
      <dd>{region.size}</dd>
    </div>
    <div>
      <dt>Number of Samples:</dt>
      <dd>{region.num_samples}</dd>
    </div>
  </RegionAttributeList>
)

const renderTrackLeftPanel = (constraintWidth: number) => {
  return (
    <SidePanel>
      <span>{`Long Read Haplotypes`}</span>
      <InfoButton topic='genomic-constraint' />
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
  typeof HaplotypeTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'RegionalConstraintTrack' implicitly has type 'any... Remove this comment to see the full error message
const HaplotypeTrack = ({ height, start, stop, regions }: RegionalConstraintTrackProps) => {
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
                  <text x={width / 2} y={height / 2} dy='0.33rem' textAnchor='middle'>
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

  console.log(haplotypeBlocks)

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
                {haplotypeBlocks.map((block: any) => {
                  const startX = scalePosition(block.start_pos)
                  const stopX = scalePosition(block.stop_pos)
                  const blockWidth = stopX - startX

                  return (
                    <TooltipAnchor
                      key={`block-${block.haplotype_id}`}
                      region={{ ...block, z: undefined, obs_exp: undefined }} // Include all block attributes except z and obs_exp
                      tooltipComponent={() => <RegionTooltip region={block} />}
                    >
                      <g>
                        <rect
                          x={startX}
                          y={22.5}
                          width={blockWidth}
                          height={15}
                          fill={regionColor(block)}
                          stroke='black'
                        />
                        {blockWidth > 32 && (
                          <text x={(startX + stopX) / 2} y={30} dy='0.33em' textAnchor='middle'>
                            {block.haplotype.alleles.join('/')}
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

HaplotypeTrack.defaultProps = {
  height: 45,
}

export default HaplotypeTrack
