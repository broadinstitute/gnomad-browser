import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear, scaleLog } from 'd3-scale'
import { SegmentedControl } from '@gnomad/ui'

// No artificial cap — render all haplotype groups

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
  initialSortBy = 'similarity_score',
  onSortModeChange = () => {},
  showMethylation = true,
  onShowMethylationChange = () => {},
  filterToOutliers = false,
  onFilterToOutliersChange = () => {},
}: {
  onMinAfChange?: (threshold: number) => void
  onColorModeChange?: (mode: string) => void
  initialMinAf?: number
  initialSortBy?: string
  onSortModeChange?: (mode: string) => void
  showMethylation?: boolean
  onShowMethylationChange?: (show: boolean) => void
  filterToOutliers?: boolean
  onFilterToOutliersChange?: (filter: boolean) => void
}) => {
  const [threshold, setThreshold] = useState(initialMinAf)
  const [colorMode, setColorMode] = useState('allele')
  const [sortMode, setSortMode] = useState(initialSortBy)

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

  const handleSortModeChange = (value: string) => {
    setSortMode(value)
    onSortModeChange(value)
  }

  const handleShowMethylationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const show = event.target.checked
    onShowMethylationChange(show)
  }

  return (
    <LegendWrapper>
      <PhasedVariantLegendSection>
        <LegendItem>
          <span>Phased variants:</span>
        </LegendItem>
        <LegendItem>
          {colorMode === 'allele' ? (
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
          <LegendItem>
            {' '}
            <span style={{ marginLeft: '5px' }}>
              SNVs {colorMode === 'allele' && <>(colored by allele)</>}
            </span>
          </LegendItem>
        </LegendItem>
        {colorMode === 'af' && (
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
          <span>Indel</span>
          {/* <span>Insertion</span> */}
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
          <span>SV</span>
          {/* <span>Deletion</span> */}
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
          marginLeft: '10px',
          minWidth: '125px',
          // border: '1px solid black',
          paddingTop: '10px',
        }}
      >
        <label>
          <input
            type='checkbox'
            checked={showMethylation}
            onChange={handleShowMethylationChange}
            style={{ marginRight: '5px' }}
          />
          Show methylation
        </label>
        {showMethylation && (
          <label style={{ marginTop: '4px' }}>
            <input
              type='checkbox'
              checked={filterToOutliers}
              onChange={(e) => onFilterToOutliersChange(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Filter to outliers
          </label>
        )}
      </div>
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
          onChange={(_value: any) => {}}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: '5px' }}>
        <label style={{ marginLeft: '3px' }}>Color by:</label>
        <SegmentedControl
          id='color-mode'
          options={[
            { label: 'Allele ID', value: 'allele' },
            { label: 'Log AF', value: 'af' },
            // { label: 'Position', value: 'position' },
            // { label: 'Haplotype count', value: 'haplotype_count' },
          ]}
          value={colorMode}
          onChange={(value: any) => handleColorModeChange(value)}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: '5px' }}>
        <label style={{ marginLeft: '3px' }}>Sort by:</label>
        <SegmentedControl
          id='sort-mode'
          options={[
            { label: 'Similarity', value: 'similarity_score' },
            { label: 'Count', value: 'sample_count' },
          ]}
          value={sortMode}
          onChange={(value: any) => handleSortModeChange(value)}
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

export type HaplotypeGroup = {
  samples: Sample[]
  variants: VariantSet
  start: number
  stop: number
  hash: number
  below_threshold: VariantSet
}

export type HaplotypeGroups = {
  groups: HaplotypeGroup[]
}

export type Methylation = {
  chr: string
  methylation: number
  pos1: number
  pos2: number
  sample: string
  coverage?: number
}

export type MethylationSummaryPoint = {
  chrom: string
  pos1: number
  pos2: number
  mean_methylation: number
  mean_coverage: number
  num_samples: number
  std_methylation?: number
  min_methylation?: number
  max_methylation?: number
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

const renderTrackLeftPanel =
  (haplotypeGroups: HaplotypeGroup[] | null, methylationMax: number, summaryOffset: number = 0) => () => {
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

    const showMethylation = methylationMax != 0
    const trackHeight = showMethylation ? 70 : 20

    return (
      <SidePanel>
        {!haplotypeGroups ? (
          <div>
            <span>No haplogroups found</span>
          </div>
        ) : (
          <svg
            width={200}
            height={
              summaryOffset +
              (haplotypeGroups.length + 1) *
                trackHeight +
              30
            }
          >
            {/* Header: Long Read Haplotypes + counts */}
            <g>
              <text x={0} y={9} fontSize='12'>
                Long Read
              </text>
              <text x={0} y={22} fontSize='12'>
                Haplotypes {`(${haplotypeGroups.length})`}
              </text>
              <text x={0} y={36} fontSize='10'>
                {`Count`}
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
            {/* Summary track y-axis — aligned with plot after header (~50px) */}
            {summaryOffset > 0 && (() => {
              // Left panel header takes ~50px. Plot summary scale: 100% at y=5, 0% at y=summaryOffset-10.
              // But left panel has header offset, so shift axis down by header height.
              const headerHeight = 50
              const axisTop = headerHeight + 5
              const axisBottom = headerHeight + summaryOffset - 10
              const axisHeight = axisBottom - axisTop
              return (
                <g transform={`translate(110, ${axisTop})`}>
                  <text x={-70} y={axisHeight / 2 - 8} fontSize='10' textAnchor='middle'>
                    Methylation
                    <tspan x={-70} dy={12}>Summary</tspan>
                    <tspan x={-70} dy={12}>(%)</tspan>
                  </text>
                  <line x1={0} y1={0} x2={0} y2={axisHeight} stroke='black' />
                  {[0, 50, 100].map((tick) => (
                    <g transform={`translate(0, ${axisHeight - (tick / 100) * axisHeight})`} key={`summary-left-${tick}`}>
                      <line x1={-5} y1={0} x2={0} y2={0} stroke='black' />
                      <text x={-10} y={3} fontSize='10' textAnchor='end'>
                        {tick}
                      </text>
                    </g>
                  ))}
                </g>
              )
            })()}
            {haplotypeGroups.map((group, index) => {
              const y = summaryOffset + 60 + index * trackHeight
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
                    {showMethylation && (
                      <g transform={`translate(110, ${y + 18})`}>
                        <text x={-70} y={17.5} fontSize='10' textAnchor='middle'>
                          Methylation (%)
                        </text>
                        <line x1={0} y1={0} x2={0} y2={35} stroke='black' />
                        {[0, 50, 100].map((tick) => (
                          <g transform={`translate(0, ${35 - (tick / 100) * 35})`} key={tick}>
                            <line x1={-5} y1={0} x2={0} y2={0} stroke='black' />
                            <text x={-10} y={3} fontSize='10' textAnchor='end'>
                              {tick}
                            </text>
                          </g>
                        ))}
                      </g>
                    )}
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
  scalePosition: (input: number) => number
  width: number
}

type HaplotypeTrackProps = {
  height?: number
  start: number
  stop: number
  haplotypeGroups: HaplotypeGroup[]
  methylationData: Methylation[]
  methylationSummary?: MethylationSummaryPoint[]
  initialMinAf?: number
  initialSortBy?: string
  onMinAfChange?: (threshold: number) => void
  onColorModeChange?: (mode: string) => void
  onSortModeChange?: (mode: string) => void
}

const variantColors: Record<string, string> = {}

const getColorForVariantByHash = (variantId: string) => {
  if (!variantColors[variantId]) {
    const variantHash = variantId
      .split('')
      .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
    const randomFactor = Math.sin(variantHash - 3.14) * 10000
    const hash = (variantHash * 9301 + 49297 + randomFactor) % 233280
    const hue = hash % 360
    const saturation = 60 + (hash % 40) // Saturation between 60% and 100%
    const lightness = 30 + (hash % 40) // Lightness between 30% and 70%
    const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    variantColors[variantId] = color
  }
  return variantColors[variantId]
}

const getColorForVariantByAf = (af: number) => {
  const afScale = scaleLog<string>().domain([0.1, 1]).range(['#d3d3d3', '#424242']).clamp(true)

  return afScale(af)
}
const getColorForVariantByPosition = (
  position: number,
  minPosition: number,
  maxPosition: number
) => {
  const fraction = (position - minPosition) / (maxPosition - minPosition)
  const hue = Math.round(240 * (1 - fraction))
  return `hsl(${hue}, 100%, 50%)`
}

const getColorForVariantByContinuousPosition = (
  position: number,
  regionStart: number,
  regionEnd: number
) => {
  const relativePosition = (position - regionStart) / (regionEnd - regionStart)
  const hue = Math.round(360 * relativePosition)
  const saturation = 70 + Math.round(relativePosition * 30) // Saturation between 70% and 100%
  const lightness = 40 + Math.round(relativePosition * 20) // Lightness between 40% and 60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

const getColorForVariantByHaplotypeCount = (haplotypeGroups: HaplotypeGroup[], locus: string) => {
  const count = haplotypeGroups.reduce(
    (acc, group) =>
      acc + (group.variants.variants.some((variant) => variant.locus === locus) ? 1 : 0),
    0
  )
  const haplotypeCountScale = scaleLinear<string>()
    .domain([0, haplotypeGroups.length])
    .range(['#d3d3d3', '#ff0000'])
    .clamp(true)
  return haplotypeCountScale(count)
}

const HaplotypeTrack = ({
  height = 500,
  haplotypeGroups,
  methylationData,
  methylationSummary = [],
  start,
  stop,
  initialMinAf = 0,
  initialSortBy = 'similarity_score',
  onMinAfChange,
  onColorModeChange,
  onSortModeChange,
}: HaplotypeTrackProps) => {
  const [colorMode, setColorMode] = useState('allele')
  const [threshold, setThreshold] = useState(initialMinAf)
  const [sortMode, setSortMode] = useState(initialSortBy)
  const [showMethylation, setShowMethylation] = useState(true)
  const [filterToOutliers, setFilterToOutliers] = useState(true)

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

  const handleSortModeChange = useCallback(
    (newSortMode: string) => {
      setSortMode(newSortMode)
      onSortModeChange && onSortModeChange(newSortMode)
    },
    [onSortModeChange]
  )

  const handleShowMethylationChange = useCallback((show: boolean) => {
    setShowMethylation(show)
  }, [])

  if (!haplotypeGroups) {
    return (
      <Wrapper>
        <Track renderLeftPanel={renderTrackLeftPanel(null, 0)}>
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

  // When filtering to outliers, only show groups containing samples with methylation data
  const outlierSampleIds = filterToOutliers && showMethylation
    ? new Set(methylationData.map(d => d.sample))
    : null
  const displayGroups = outlierSampleIds
    ? haplotypeGroups.filter(g => g.samples.some(s => outlierSampleIds.has(s.sample_id)))
    : haplotypeGroups

  const regionSize = stop - start
  const variantCircleRadius = regionSize > 100000 ? 2 : 4

  // Build lookup from position to summary stats for coloring dots by deviation
  const summaryByPos = React.useMemo(() => {
    const map = new Map<number, { mean: number; std: number }>()
    for (const s of methylationSummary) {
      map.set(s.pos1, { mean: s.mean_methylation, std: s.std_methylation || 0 })
    }
    return map
  }, [methylationSummary])

  const summaryTrackHeight = showMethylation && methylationSummary.length > 0 ? 120 : 0
  const methylationPlotHeight = showMethylation
    ? (displayGroups.length + 1) * 50
    : 0

  const dynamicHeight =
    summaryTrackHeight +
    displayGroups.length * 21 +
    methylationPlotHeight

  const methylationYScale = scaleLinear()
    .domain([0, Math.max(...methylationData.map((d) => d.methylation))])
    .range([65, 35])

  return (
    <Wrapper>
      <Track
        renderLeftPanel={renderTrackLeftPanel(
          displayGroups,
          showMethylation ? Math.max(...methylationData.map((d) => d.methylation)) : 0,
          summaryTrackHeight
        )}
      >
        {({ scalePosition, width }: TrackProps) => (
          <>
            <TopPanel>
              <Legend
                initialMinAf={initialMinAf}
                initialSortBy={initialSortBy}
                onMinAfChange={handleMinAfChange}
                onColorModeChange={handleColorModeChange}
                onSortModeChange={handleSortModeChange}
                showMethylation={showMethylation}
                onShowMethylationChange={handleShowMethylationChange}
                filterToOutliers={filterToOutliers}
                onFilterToOutliersChange={setFilterToOutliers}
              />
            </TopPanel>
            <PlotWrapper>
              <svg height={dynamicHeight} width={width}>
                {/* Summary methylation track */}
                {showMethylation && methylationSummary.length > 0 && (() => {
                  const summaryMethScale = scaleLinear()
                    .domain([0, 100])
                    .range([summaryTrackHeight - 10, 5])
                  // High-variance threshold: std > 20% indicates outlier CpG sites
                  const HIGH_VARIANCE_THRESHOLD = 20
                  return (
                    <g>
                      {/* Background */}
                      <rect x={0} y={0} width={width} height={summaryTrackHeight} fill='#fafafa' stroke='#e0e0e0' />
                      {/* Y-axis ticks */}
                      {[0, 50, 100].map(tick => (
                        <g key={`summary-tick-${tick}`}>
                          <line x1={0} y1={summaryMethScale(tick)} x2={width} y2={summaryMethScale(tick)} stroke='#eee' />
                        </g>
                      ))}
                      {/* Mean line + variance band */}
                      {methylationSummary.map((d, i) => {
                        const x = scalePosition(d.pos1)
                        const isOutlier = (d.std_methylation || 0) > HIGH_VARIANCE_THRESHOLD
                        const stdVal = d.std_methylation || 0
                        const yMean = summaryMethScale(d.mean_methylation)
                        const yHigh = summaryMethScale(Math.min(100, d.mean_methylation + stdVal))
                        const yLow = summaryMethScale(Math.max(0, d.mean_methylation - stdVal))
                        return (
                          <g key={`summary-${i}`}>
                            {/* Std deviation band */}
                            <line x1={x} y1={yHigh} x2={x} y2={yLow}
                              stroke={isOutlier ? 'rgba(220, 38, 38, 0.4)' : 'rgba(100, 100, 200, 0.15)'}
                              strokeWidth={isOutlier ? 2 : 1} />
                            {/* Mean dot */}
                            <TooltipAnchor
                              tooltipComponent={() => (
                                <RegionAttributeList>
                                  <div><dt>Position:</dt><dd>{d.pos1}</dd></div>
                                  <div><dt>Mean methylation:</dt><dd>{d.mean_methylation.toFixed(1)}%</dd></div>
                                  <div><dt>Std dev:</dt><dd>{stdVal.toFixed(1)}%</dd></div>
                                  <div><dt>Range:</dt><dd>{(d.min_methylation || 0).toFixed(1)}% - {(d.max_methylation || 0).toFixed(1)}%</dd></div>
                                  <div><dt>Mean coverage:</dt><dd>{d.mean_coverage.toFixed(0)}x</dd></div>
                                  <div><dt>Samples:</dt><dd>{d.num_samples}</dd></div>
                                  {isOutlier && <div><dt style={{color: '#dc2626'}}>High variance site</dt><dd></dd></div>}
                                </RegionAttributeList>
                              )}
                            >
                              <circle cx={x} cy={yMean} r={isOutlier ? 4 : 2.5}
                                fill={isOutlier ? '#dc2626' : '#4a5568'} />
                            </TooltipAnchor>
                          </g>
                        )
                      })}
                      {/* Separator line */}
                      <line x1={0} y1={summaryTrackHeight} x2={width} y2={summaryTrackHeight} stroke='#ccc' />
                    </g>
                  )
                })()}
                {displayGroups.map((group, rowIndex) => {
                  const startX = scalePosition(start)
                  const stopX = scalePosition(stop)
                  const groupWidth = stopX - startX
                  const trackHeight = showMethylation ? 70 : 20

                  // Get methylation data for samples in this haplotype group
                  const groupSampleIds = new Set(group.samples.map(s => s.sample_id))
                  const methSampleData = methylationData.filter(d => groupSampleIds.has(d.sample))

                  const rowY = summaryTrackHeight + rowIndex * trackHeight

                  return (
                    <>
                      <g key={`haplo-${rowIndex}`}>
                        <rect
                          x={startX}
                          y={5 + rowY}
                          width={groupWidth}
                          height={15}
                          fill='#f0f0f0'
                          stroke='none'
                        />
                        <line
                          x1={startX}
                          y1={12.5 + rowY}
                          x2={stopX}
                          y2={12.5 + rowY}
                          stroke='#a8a8a8'
                          strokeWidth={1}
                        />
                        {group.below_threshold.variants.map((variant, index) => (
                          <TooltipAnchor
                            key={`below-${group.hash}-${index}`}
                            tooltipComponent={() => <VariantTooltip variant={variant} />}
                          >
                            <circle
                              cx={scalePosition(variant.position)}
                              cy={12.5 + rowY}
                              r={1.5}
                              fill='none'
                              stroke={
                                colorMode === 'allele'
                                  ? getColorForVariantByHash(variant.locus)
                                  : 'grey'
                              }
                            />
                          </TooltipAnchor>
                        ))}
                        {group.variants.variants.map((variant) => {
                          let isDottedLine = false
                          let color

                          if (colorMode === 'allele') {
                            color = getColorForVariantByHash(variant.locus)
                          } else if (colorMode === 'position') {
                            color = getColorForVariantByPosition(variant.position, start, stop)
                          } else if (colorMode === 'af') {
                            color = getColorForVariantByAf(variant.info_AF[0])
                          } else if (colorMode === 'haplotype_count') {
                            color = getColorForVariantByHaplotypeCount(
                              haplotypeGroups,
                              variant.locus
                            )
                          }

                          if (variant.info_SVTYPE === 'DEL') {
                            isDottedLine = true
                            color = 'rgba(255, 69, 58, 0.8)'
                          } else if (variant.info_SVTYPE === 'INS') {
                            isDottedLine = true
                            color = 'rgba(0, 122, 255, 0.8)'
                          }

                          return (
                            <TooltipAnchor
                              key={`${group.hash}-${variant.locus}-${variant.alleles.join('-')}`}
                              tooltipComponent={() => <VariantTooltip variant={variant} />}
                            >
                              {isDottedLine ? (
                                <line
                                  x1={scalePosition(variant.position)}
                                  y1={5 + rowY}
                                  x2={scalePosition(variant.position)}
                                  y2={20 + rowY}
                                  stroke={color}
                                  strokeDasharray='4 2'
                                  strokeWidth={Math.min(5, 2 + (variant.info_SVLEN / 100) * 10)}
                                />
                              ) : (
                                <circle
                                  cx={scalePosition(variant.position)}
                                  cy={12.5 + rowY}
                                  r={variantCircleRadius}
                                  fill={color}
                                  stroke='black'
                                />
                              )}
                            </TooltipAnchor>
                          )
                        })}
                      </g>
                      <g>
                        {showMethylation &&
                          methSampleData.map((d, index) => {
                            const stats = summaryByPos.get(d.pos1)
                            const deviation = stats ? d.methylation - stats.mean : 0
                            const zScore = stats && stats.std > 0 ? deviation / stats.std : 0
                            // Red = hypomethylated (below mean), blue = hypermethylated, grey = normal
                            let dotColor = '#aaa'
                            let dotRadius = 2
                            if (Math.abs(zScore) > 2) {
                              dotColor = deviation < 0 ? '#dc2626' : '#2563eb'
                              dotRadius = 3
                            } else if (Math.abs(zScore) > 1) {
                              dotColor = deviation < 0 ? '#f87171' : '#60a5fa'
                            }
                            return (
                              <TooltipAnchor
                                key={`methylation-${rowIndex}-${index}`}
                                tooltipComponent={() => (
                                  <RegionAttributeList>
                                    <div>
                                      <dt>Position:</dt>
                                      <dd>{d.pos1}</dd>
                                    </div>
                                    <div>
                                      <dt>Methylation:</dt>
                                      <dd>{d.methylation.toFixed(1)}%</dd>
                                    </div>
                                    {stats && (
                                      <div>
                                        <dt>Mean:</dt>
                                        <dd>{stats.mean.toFixed(1)}% (z={zScore.toFixed(1)})</dd>
                                      </div>
                                    )}
                                    {d.coverage !== undefined && (
                                      <div>
                                        <dt>Coverage:</dt>
                                        <dd>{d.coverage}x</dd>
                                      </div>
                                    )}
                                    <div>
                                      <dt>Sample:</dt>
                                      <dd>{d.sample}</dd>
                                    </div>
                                  </RegionAttributeList>
                                )}
                              >
                                <circle
                                  cx={scalePosition(d.pos1)}
                                  cy={methylationYScale(d.methylation) + rowY}
                                  r={dotRadius}
                                  fill={dotColor}
                                  stroke='none'
                                />
                              </TooltipAnchor>
                            )
                          })}
                      </g>
                    </>
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
