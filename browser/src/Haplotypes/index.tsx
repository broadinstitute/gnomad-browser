import React from 'react'
import styled from 'styled-components'
import queryString from 'query-string'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import Link from '../Link'
import InfoButton from '../help/InfoButton'

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
  if (region.num_samples > 2) {
    return '#b35806'
  } else if (region.num_samples > 1) {
    return '#f1a340'
  } else {
    return '#fee0b6'
  }
}

const computeNumSamples = (group: HaplotypeGroup) => {
  return group.samples.length
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
        <rect x={95} y={0} width={40} height={10} stroke='#000' fill='#fee0b6' />
        <rect x={135} y={0} width={40} height={10} stroke='#000' fill='#f1a340' />
        <rect x={175} y={0} width={40} height={10} stroke='#000' fill='#b35806' />
        <text x={220} y={-4} fontSize='10' dy='1.2em'>
          More common
        </text>
        <text x={110} y={10} fontSize='10' dy='1.2em' textAnchor='middle' />
        <text x={135} y={10} fontSize='10' dy='1.2em' textAnchor='middle'>
          2
        </text>
        <text x={175} y={10} fontSize='10' dy='1.2em' textAnchor='middle'>
          3
        </text>
      </svg>
    </LegendWrapper>
  )
}

const renderNumber = (number: number | null | undefined) =>
  number === undefined || number === null ? '-' : number.toPrecision(4)

type Variant = {
  locus: string
  position: number
  chrom: string
  alleles: string[]
  rsid: string
  qual: number
  filters: any[]
  info_AF: number[]
  info_AC: number
  info_CM: number[]
  info_AN: number
  GT_alleles: number[]
  GT_phased: boolean
}

type VariantSet = {
  variants: Variant[]
  phase_type: string
}

type Sample = {
  sample_id: string
  variant_sets: VariantSet[]
}

type HaplotypeGroup = {
  samples: Sample[]
  variants: VariantSet
  start: number
  stop: number
}

type HaplotypeGroups = {
  groups: HaplotypeGroup[]
}

const RegionTooltip = ({ region }: { region: HaplotypeGroup }) => (
  <RegionAttributeList>
    <div>
      <dt>Start:</dt>
      <dd>{region.start}</dd>
    </div>
    <div>
      <dt>Stop:</dt>
      <dd>{region.stop}</dd>
    </div>
    <div>
      <dt>Num Samples:</dt>
      <dd>{region.samples.length}</dd>
    </div>
    <div>
      <dt>Size:</dt>
      <dd>{region.stop - region.start}</dd>
    </div>
    <div>
      <dt>Variant Count:</dt>
      <dd>{region.variants.variants.length}</dd>
    </div>
    {region.variants.variants.map((variant) => (
      <div key={variant.position}>
        <dt>Variant Position:</dt>
        <dd>{variant.position}</dd>
        <dt>Alleles:</dt>
        <dd>
          {variant.alleles.join(', ').length > 5
            ? variant.alleles.join(', ').substring(0, 5) + '...'
            : variant.alleles.join(', ')}
        </dd>
      </div>
    ))}
    <div>
      <dt>Sample IDs:</dt>
      <dd>{region.samples.map((sample) => sample.sample_id).join(', ')}</dd>
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
  haplotypeGroups: HaplotypeGroup[] | null
}

const HaplotypeTrack = ({ height = 5000, haplotypeGroups }: OwnRegionalConstraintTrackProps) => {
  if (!haplotypeGroups) {
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
  let variantId = currentParams.variant as string

  return (
    <Wrapper>
      <Track renderLeftPanel={renderTrackLeftPanel}>
        {({ scalePosition, width }: TrackProps) => {
          const rows: HaplotypeGroup[][] = [[]]

          haplotypeGroups.forEach((group: HaplotypeGroup) => {
            const startX = scalePosition(group.start.toString())
            const stopX = scalePosition(group.stop.toString())
            const groupWidth = stopX - startX

            let placed = false

            for (const row of rows) {
              if (
                row.length === 0 ||
                scalePosition(row[row.length - 1].stop.toString()) + 1 < startX
              ) {
                row.push(group)
                placed = true
                break
              }
            }

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
                  {variantId && (
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
                    row.map((group) => {
                      const startX = scalePosition(group.start.toString())
                      const stopX = scalePosition(group.stop.toString())
                      const groupWidth = stopX - startX
                      const num_samples = computeNumSamples(group)

                      return (
                        <TooltipAnchor
                          key={`group-${group.start}-${group.stop}`}
                          tooltipComponent={() => <RegionTooltip region={group} />}
                        >
                          <g>
                            {group.stop - group.start === 0 ? (
                              <circle
                                cx={(startX + stopX) / 2}
                                cy={30 + rowIndex * 20}
                                r={5}
                                fill={regionColor({ num_samples })}
                                stroke='black'
                              />
                            ) : (
                              <>
                                <rect
                                  x={startX}
                                  y={22.5 + rowIndex * 20}
                                  width={groupWidth}
                                  height={15}
                                  fill={regionColor({ num_samples })}
                                  stroke='black'
                                />
                                {group.variants.variants.map((variant) => (
                                  <circle
                                    key={variant.locus}
                                    cx={scalePosition(variant.position.toString())}
                                    cy={27 + rowIndex * 20 + 8 / 2} // Center the circles inside the rect
                                    r={3}
                                    fill='#000'
                                  />
                                ))}
                              </>
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

export default HaplotypeTrack
