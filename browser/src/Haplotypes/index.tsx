import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import queryString from 'query-string'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import Link from '../Link'
import { scaleLinear, scaleLog } from 'd3-scale'
import { Button, Checkbox, SearchInput, SegmentedControl } from '@gnomad/ui'

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
  align-items: center;

  @media (max-width: 600px) {
    flex-direction: column;
    justify-content: center;
  }
`

const PhasedVariantLegendSection = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid lightgrey;
  border-radius: 5px;
  padding: 5px;

  @media (max-width: 600px) {
    flex-direction: column;
    justify-content: center;
  }
`
const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-right: 1em;
`
export const Legend = ({
  onMinAfChange = () => {},
  onColorModeChange = () => {},
  initialMinAf = 0,
  onSortModeChange = () => {},
}: {
  onMinAfChange?: (threshold: number) => void
  onColorModeChange?: (mode: string) => void
  initialMinAf?: number
  onSortModeChange?: (mode: string) => void
}) => {
  const [threshold, setThreshold] = useState(initialMinAf)
  const [colorMode, setColorMode] = useState('log_af')
  const [sortMode, setSortMode] = useState('position')

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseFloat(event.target.value)
    setThreshold(newThreshold)
    onMinAfChange(newThreshold)
  }

  const handleColorModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newColorMode = event.target.value
    setColorMode(newColorMode)
    onColorModeChange(newColorMode)
  }

  const handleSortModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortMode = event.target.value
    setSortMode(newSortMode)
    onSortModeChange(newSortMode)
  }

  return (
    <LegendWrapper>
      <PhasedVariantLegendSection>
        <LegendItem>
          <span>Phased variants:</span>
        </LegendItem>
        <LegendItem>
          {colorMode === 'hash' ? (
            <svg width={30} height={30}>
              <defs>
                <linearGradient id='rainbow-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                  <stop offset='0%' stopColor='hsl(0, 70%, 50%)' />
                  <stop offset='25%' stopColor='hsl(90, 70%, 50%)' />
                  <stop offset='50%' stopColor='hsl(180, 70%, 50%)' />
                  <stop offset='75%' stopColor='hsl(270, 70%, 50%)' />
                  <stop offset='100%' stopColor='hsl(360, 70%, 50%)' />
                </linearGradient>
              </defs>
              <circle cx={15} cy={15} r={4} fill='url(#rainbow-gradient)' stroke='black' />
            </svg>
          ) : (
            <svg width={30} height={30}>
              <circle cx={15} cy={15} r={4} fill='#d3d3d3' stroke='black' />
            </svg>
          )}
          <span> SNVs </span>
        </LegendItem>
        {colorMode === 'log_af' && (
          <LegendItem>
            <svg width={100} height={30}>
              <defs>
                <linearGradient id='logAfGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                  <stop offset='0%' style={{ stopColor: '#d3d3d3', stopOpacity: 1 }} />
                  <stop offset='100%' style={{ stopColor: '#424242', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <rect x='20' y='5' width='60' height='10' fill='url(#logAfGradient)' />
              <text x='10' y='15' fontSize='10' textAnchor='middle'>
                0.1
              </text>
              <text x='90' y='15' fontSize='10' textAnchor='middle'>
                1.0
              </text>
              <text x='50' y='27' fontSize='10' textAnchor='middle'>
                Allele frequency
              </text>
            </svg>
          </LegendItem>
        )}
        <LegendItem>
          <svg width={30} height={30}>
            <line
              x1={15}
              y1={5}
              x2={15}
              y2={25}
              stroke='rgba(0, 122, 255, 0.8)'
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
              stroke='rgba(255, 69, 58, 0.8)'
              strokeDasharray='4 2'
              strokeWidth={4}
            />
          </svg>
          <span>Deletion</span>
        </LegendItem>
        <LegendItem>
          <svg width={35} height={30}>
            <circle cx={15} cy={15} r={2} fill='none' stroke='grey' />
          </svg>
          <span>Below AF cutoff</span>
        </LegendItem>
      </PhasedVariantLegendSection>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: '200px',
          marginLeft: '25',
        }}
      >
        <label htmlFor='threshold-slider'>Minimum variant AF:</label>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <input
            type='range'
            id='threshold-slider'
            min='0'
            max='1'
            step='0.01'
            value={threshold}
            onChange={handleThresholdChange}
          />
          <span style={{ marginLeft: '3px' }}>{threshold.toFixed(2)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: '5px' }}>
        <label style={{ marginLeft: '3px' }}>Dataset:</label>
        <SegmentedControl
          id='dataset-dummy'
          options={[
            { label: 'PacBio', value: 'pacbio' },
            { label: 'ONT', value: 'ont' },
          ]}
          value={'pacbio'}
          onChange={(value) => {}}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: '5px' }}>
        <label style={{ marginLeft: '3px' }}>Color by:</label>
        <SegmentedControl
          id='color-mode'
          options={[
            { label: 'Allele ID', value: 'hash' },
            { label: 'Log AF', value: 'log_af' },
          ]}
          value={colorMode}
          onChange={(value) => handleColorModeChange({ target: { value } })}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: '5px' }}>
        <label style={{ marginLeft: '3px' }}>Sort by:</label>
        <SegmentedControl
          id='sort-mode'
          options={[
            { label: 'Similarity', value: 'position' },
            { label: 'Count', value: 'frequency' },
          ]}
          value={sortMode}
          onChange={(value) => handleSortModeChange({ target: { value } })}
        />
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
  below_threshold: VariantSet
}

type HaplotypeGroups = {
  groups: HaplotypeGroup[]
}

const HaplotypeGroupTooltip = ({ group }: { group: HaplotypeGroup }) => (
  <RegionAttributeList>
    <div>
      <dt>Start:</dt>
      <dd>{group.start}</dd>
    </div>
    <div>
      <dt>Stop:</dt>
      <dd>{group.stop}</dd>
    </div>
    <div>
      <dt>Num Samples:</dt>
      <dd>{group.samples.length}</dd>
    </div>
    <div>
      <dt>Size:</dt>
      <dd>{group.stop - group.start}</dd>
    </div>
    <div>
      <dt>Variant Count:</dt>
      <dd>{group.variants.variants.length}</dd>
    </div>
    <div>
      <dt>Sample IDs:</dt>
      <dd>{group.samples.map((sample) => sample.sample_id).join(', ')}</dd>
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
        <svg width={200} height={(haplotypeGroups.length + 1) * 20 + 30}>
          <g>
            <text x={0} y={9} fontSize='12'>
              Long Read
            </text>
            <text x={0} y={22} fontSize='12'>
              Haplotypes {`(${haplotypeGroups.length})`}
            </text>
            <text x={0} y={36} fontSize='10'>
              {`Samples `}
              <tspan x={0} dy={12} fontSize='8'>
                ({haplotypeGroups.reduce((sum, group) => sum + group.samples.length, 0)})
              </tspan>
            </text>
            <text x={50} y={36} fontSize='10'>
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
          {haplotypeGroups.map((group, index) => {
            const y = 60 + index * 20
            return (
              <TooltipAnchor
                key={`${group.hash}-tooltip-${group.samples.length}-${group.variants.variants.length}`}
                tooltipComponent={() => <HaplotypeGroupTooltip group={group} />}
              >
                <g>
                  <circle cx={5} cy={y} r={5} fill={sampleColorScale(group.samples.length)} />
                  <text x={15} y={y + 5} fontSize='12'>
                    {group.samples.length}
                  </text>
                  <circle
                    cx={50}
                    cy={y}
                    r={5}
                    fill={variantColorScale(group.variants.variants.length)}
                  />
                  <text x={60} y={y + 5} fontSize='12'>
                    {group.variants.variants.length}
                  </text>
                </g>
              </TooltipAnchor>
            )
          })}
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
  onMinAfChange?: (threshold: number) => void
  onColorModeChange?: (mode: string) => void
}

const variantColors: Record<string, string> = {}

const getColorForVariantByHash = (variantId: string) => {
  if (!variantColors[variantId]) {
    const seed = variantId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const hash = (seed * 9301 + 49297) % 233280
    const hue = hash % 360
    const saturation = 70 + (hash % 30) // Saturation between 70% and 100%
    const lightness = 40 + (hash % 20) // Lightness between 40% and 60%
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    variantColors[variantId] = color
  }
  return variantColors[variantId]
}

const getColorForVariantByAf = (af: number) => {
  const afScale = scaleLog<string>().domain([0.1, 1]).range(['#d3d3d3', '#424242']).clamp(true)

  return afScale(af)
}

const HaplotypeTrack = ({
  height,
  haplotypeGroups,
  start,
  stop,
  initialMinAf = 0,
  onMinAfChange,
  onColorModeChange,
}: HaplotypeTrackProps) => {
  const [colorMode, setColorMode] = useState('log_af')
  const [threshold, setThreshold] = useState(initialMinAf)

  const handleColorModeChange = useCallback(
    (mode: string) => {
      setColorMode(mode)
      onColorModeChange && onColorModeChange(mode)
    },
    [onColorModeChange]
  )

  const handleMinAfChange = useCallback(
    (newThreshold: number) => {
      setThreshold(newThreshold)
      onMinAfChange && onMinAfChange(newThreshold)
    },
    [onMinAfChange]
  )

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
  const dynamicHeight = haplotypeGroups.length * 21 + 7

  console.log(haplotypeGroups)

  return (
    <Wrapper>
      <Track renderLeftPanel={renderTrackLeftPanel(haplotypeGroups)}>
        {({ scalePosition, width }: TrackProps) => (
          <>
            <TopPanel>
              <Legend
                initialMinAf={initialMinAf}
                onMinAfChange={handleMinAfChange}
                onColorModeChange={handleColorModeChange}
              />
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
                  const startX = scalePosition(start)
                  const stopX = scalePosition(stop)
                  const groupWidth = stopX - startX

                  return (
                    <g>
                      <rect
                        x={startX}
                        y={5 + rowIndex * 20}
                        width={groupWidth}
                        height={15}
                        fill='#f0f0f0'
                        stroke='none'
                      />
                      <line
                        x1={startX}
                        y1={12.5 + rowIndex * 20}
                        x2={stopX}
                        y2={12.5 + rowIndex * 20}
                        stroke='#a8a8a8'
                        strokeWidth={1}
                      />
                      {group.below_threshold.variants.map((variant, index) => (
                        <TooltipAnchor
                          key={`below-${group.hash}-${index}`}
                          tooltipComponent={() => <VariantTooltip variant={variant} />}
                        >
                          <circle
                            cx={scalePosition(variant.position.toString())}
                            cy={12.5 + rowIndex * 20}
                            r={1.5}
                            fill='none'
                            stroke={
                              colorMode === 'hash'
                                ? getColorForVariantByHash(variant.locus)
                                : 'grey'
                            }
                          />
                        </TooltipAnchor>
                      ))}
                      {group.variants.variants.map((variant) => {
                        let isDottedLine = false
                        let color

                        if (colorMode === 'hash') {
                          color = getColorForVariantByHash(variant.locus)
                        } else {
                          color = getColorForVariantByAf(variant.info_AF[0])
                        }

                        if (variant.info_SVTYPE === 'DEL') {
                          isDottedLine = true
                          color = 'rgba(255, 69, 58, 0.8)' // stylish red with transparency
                        } else if (variant.info_SVTYPE === 'INS') {
                          isDottedLine = true
                          color = 'rgba(0, 122, 255, 0.8)' // stylish blue with transparency
                        }

                        return (
                          <TooltipAnchor
                            key={`${group.hash}-${variant.locus}-${variant.alleles.join('-')}`}
                            tooltipComponent={() => <VariantTooltip variant={variant} />}
                          >
                            {isDottedLine ? (
                              <line
                                x1={scalePosition(variant.position.toString())}
                                y1={5 + rowIndex * 20}
                                x2={scalePosition(variant.position.toString())}
                                y2={20 + rowIndex * 20}
                                stroke={color}
                                strokeDasharray='4 2'
                                strokeWidth={Math.min(5, 2 + (variant.info_SVLEN / 100) * 10)} // Scale strokeWidth based on SV length, capped at 6px
                              />
                            ) : (
                              <circle
                                cx={scalePosition(variant.position.toString())}
                                cy={12.5 + rowIndex * 20}
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
