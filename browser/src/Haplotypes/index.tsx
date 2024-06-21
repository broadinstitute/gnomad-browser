import React, { useState } from 'react'
import styled from 'styled-components'
import queryString from 'query-string'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import Link from '../Link'
import { scaleLinear } from 'd3-scale'

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

const LegendWrapper = styled.div`
  display: flex;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
  }
`
const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-right: 1em;
`
export const Legend = ({
  onMinAfChange = () => {},
}: {
  onMinAfChange?: (threshold: number) => void
}) => {
  const [threshold, setThreshold] = useState(0)

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseFloat(event.target.value)
    setThreshold(newThreshold)
    onMinAfChange(newThreshold)
  }

  return (
    <LegendWrapper>
      <LegendItem>
        <svg width={30} height={30}>
          <circle cx={15} cy={15} r={4} fill='#d3d3d3' stroke='#000000' />
        </svg>
        <span>Phased variants (unique colors for each ID)</span>
      </LegendItem>
      <LegendItem>
        <svg width={30} height={30}>
          <line
            x1={15}
            y1={5}
            x2={15}
            y2={25}
            stroke='#FF0000'
            strokeDasharray='4 2'
            strokeWidth={4}
          />
        </svg>
        <span>Insertion</span>
      </LegendItem>
      <LegendItem>
        <svg width={30} height={30}>
          <line
            x1={15}
            y1={5}
            x2={15}
            y2={25}
            stroke='#0000FF'
            strokeDasharray='4 2'
            strokeWidth={4}
          />
        </svg>
        <span>Deletion</span>
      </LegendItem>
      <div style={{ minWidth: '300px', marginLeft: '50px' }}>
        <label htmlFor='threshold-slider'>Min AF:</label>
        <input
          type='range'
          id='threshold-slider'
          min='0'
          max='1'
          step='0.01'
          value={threshold}
          onChange={handleThresholdChange}
        />
        <span>{threshold.toFixed(2)}</span>
      </div>
    </LegendWrapper>
  )
}

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
  info_SVTYPE: string
  info_SVLEN: number
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
  hash: number
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
      <div key={`${region.hash}-${variant.position}-${variant.alleles.join('-')}`}>
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

const VariantTooltip = ({ variant }: { variant: Variant }) => (
  <RegionAttributeList>
    <div>
      <dt>Position:</dt>
      <dd>{variant.position}</dd>
    </div>
    <div>
      <dt>Ref:</dt>
      <dd>
        {variant.alleles[0].length > 10
          ? variant.alleles[0].substring(0, 10) + '...'
          : variant.alleles[0]}
      </dd>
    </div>
    <div>
      <dt>Alt:</dt>
      <dd>
        {variant.alleles[1].length > 10
          ? variant.alleles[1].substring(0, 10) + '...'
          : variant.alleles[1]}
      </dd>
    </div>
    <div>
      <dt>RSID:</dt>
      <dd>{variant.rsid.length > 10 ? `${variant.rsid.substring(0, 10)}...` : variant.rsid}</dd>
    </div>
    <div>
      <dt>SVTYPE:</dt>
      <dd>{variant.info_SVTYPE}</dd>
    </div>
    <div>
      <dt>SVLEN:</dt>
      <dd>{variant.info_SVLEN}</dd>
    </div>
    <div>
      <dt>Quality:</dt>
      <dd>{variant.qual}</dd>
    </div>
    <div>
      <dt>Allele Frequency:</dt>
      <dd>{variant.info_AF.join(', ')}</dd>
    </div>
    <div>
      <dt>Allele Count:</dt>
      <dd>{variant.info_AC}</dd>
    </div>
    {/* <div> */}
    {/*   <dt>Sample Alleles:</dt> */}
    {/*   <dd>{variant.GT_alleles.join(', ')}</dd> */}
    {/* </div> */}
    <div>
      <dt>Phased:</dt>
      <dd>{variant.GT_phased ? 'Yes' : 'No'}</dd>
    </div>
  </RegionAttributeList>
)

const renderTrackLeftPanel = (haplotypeGroups: HaplotypeGroup[] | null) => () => {
  const maxSamples = (haplotypeGroups || []).reduce(
    (max, group) => Math.max(max, group.samples.length),
    0
  )
  const maxVariants = (haplotypeGroups || []).reduce(
    (max, group) => Math.max(max, group.variants.variants.length),
    0
  )

  const sampleColorScale = scaleLinear<string>()
    .domain([0, maxSamples === 0 ? 1 : maxSamples])
    .range(['#fee0b6', '#b35806'])

  const variantColorScale = scaleLinear<string>()
    .domain([0, maxVariants === 0 ? 1 : maxVariants])
    .range(['#efefef', '#7f7f7f'])

  return (
    <SidePanel>
      {!haplotypeGroups ? (
        <div>
          <span>No haplogroups found</span>
        </div>
      ) : (
        <svg width={200} height={haplotypeGroups.length * 20 + 30}>
          <g>
            <text x={0} y={20} fontSize='12'>
              {`Haplotypes (${haplotypeGroups.length})`}
            </text>
            <text x={0} y={34} fontSize='10'>
              {`Samples `}
              <tspan x={0} dy={12} fontSize='8'>
                ({haplotypeGroups.reduce((sum, group) => sum + group.samples.length, 0)})
              </tspan>
            </text>
            <text x={50} y={34} fontSize='10'>
              {`Variants `}
              <tspan x={50} dy={12} fontSize='8'>
                (
                {
                  new Set(
                    haplotypeGroups.flatMap((group) =>
                      group.variants.variants.map((variant) => variant.locus)
                    )
                  ).size
                }
                )
              </tspan>
            </text>
          </g>
          {haplotypeGroups.map((group, index) => (
            <TooltipAnchor
              key={`${group.hash}-tooltip-${group.samples.length}-${group.variants.variants.length}`}
              tooltipComponent={() => <RegionTooltip region={group} />}
            >
              <g>
                <circle
                  cx={5}
                  cy={60 + index * 20 - 5}
                  r={5}
                  fill={sampleColorScale(group.samples.length)}
                />
                <text x={15} y={60 + index * 20} fontSize='12'>
                  {group.samples.length}
                </text>
                <circle
                  cx={50}
                  cy={60 + index * 20 - 5}
                  r={5}
                  fill={variantColorScale(group.variants.variants.length)}
                />
                <text x={60} y={60 + index * 20} fontSize='12'>
                  {group.variants.variants.length}
                </text>
              </g>
            </TooltipAnchor>
          ))}
        </svg>
      )}
    </SidePanel>
  )
}

const SidePanel = styled.div`
  display: flex;
  align-items: flex-start;
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

type HaplotypeTrackProps = {
  height?: number
  start: number
  stop: number
  haplotypeGroups: HaplotypeGroup[] | null
  onMinAfChange?: (threshold: number) => {}
}

const variantColors: Record<string, string> = {}

const getColorForVariant = (variantId: string) => {
  if (!variantColors[variantId]) {
    const seed = variantId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    // Use a simple hash function for more randomness
    const hash = (seed * 9301 + 49297) % 233280
    const hue = hash % 360
    const color = `hsl(${hue}, 100%, 50%)`
    variantColors[variantId] = color
  }
  return variantColors[variantId]
}

const HaplotypeTrack = ({
  height = 2500,
  haplotypeGroups,
  start,
  stop,
  onMinAfChange,
}: HaplotypeTrackProps) => {
  if (!haplotypeGroups) {
    return (
      <Wrapper>
        <Track renderLeftPanel={renderTrackLeftPanel(null)}>
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

  const regionSize = stop - start
  const variantCircleRadius = regionSize > 100000 ? 2 : 4

  const currentParams = queryString.parse(location.search)
  let variantId = currentParams.variant as string
  const dynamicHeight = haplotypeGroups.length * 25

  console.log(haplotypeGroups)

  return (
    <Wrapper>
      <Track renderLeftPanel={renderTrackLeftPanel(haplotypeGroups)}>
        {({ scalePosition, width }: TrackProps) => (
          <>
            <TopPanel>
              <Legend onMinAfChange={onMinAfChange} />
            </TopPanel>
            <PlotWrapper>
              <svg height={dynamicHeight} width={width}>
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
                {haplotypeGroups.map((group, rowIndex) => {
                  const startX = scalePosition(group.start.toString())
                  const stopX = scalePosition(group.stop.toString())
                  const groupWidth = stopX - startX

                  return (
                    <g>
                      <rect
                        x={startX}
                        y={22.5 + rowIndex * 20}
                        width={groupWidth}
                        height={15}
                        fill='#d3d3d3'
                        stroke='none'
                      />
                      <line
                        x1={startX}
                        y1={30 + rowIndex * 20}
                        x2={stopX}
                        y2={30 + rowIndex * 20}
                        stroke='black'
                        strokeWidth={1}
                      />
                      {group.variants.variants.map((variant) => {
                        let isDottedLine = false
                        let color = getColorForVariant(variant.locus)

                        if (variant.info_SVTYPE === 'DEL' && variant.info_SVLEN > 5) {
                          // Deletion
                          isDottedLine = true
                          color = '#FF0000' // Red
                        } else if (variant.info_SVTYPE === 'INS' && variant.info_SVLEN > 5) {
                          // Insertion
                          isDottedLine = true
                          color = '#0000FF' // Blue
                        }

                        return (
                          <TooltipAnchor
                            key={`${group.hash}-${variant.locus}-${variant.alleles.join('-')}`}
                            tooltipComponent={() => <VariantTooltip variant={variant} />}
                          >
                            {isDottedLine ? (
                              <line
                                x1={scalePosition(variant.position.toString())}
                                y1={22.5 + rowIndex * 20}
                                x2={scalePosition(variant.position.toString())}
                                y2={37.5 + rowIndex * 20}
                                stroke={color}
                                strokeDasharray='4 2'
                                strokeWidth={4}
                              />
                            ) : (
                              <circle
                                cx={scalePosition(variant.position.toString())}
                                cy={30 + rowIndex * 20}
                                r={variantCircleRadius}
                                fill={color}
                                stroke='black'
                              />
                            )}
                          </TooltipAnchor>
                        )
                      })}
                    </g>
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

export default HaplotypeTrack
