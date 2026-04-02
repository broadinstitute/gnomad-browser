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
  position: relative;
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
  onLoadAllSamples,
  methylationLoading = false,
  methylationSampleCount = 0,
  methylationTotalSamples = 0,
  showMqtl = false,
  onShowMqtlChange = () => {},
  mqtlLoading = false,
  mqtlData = [],
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
  onLoadAllSamples?: () => void
  methylationLoading?: boolean
  methylationSampleCount?: number
  methylationTotalSamples?: number
  showMqtl?: boolean
  onShowMqtlChange?: (show: boolean) => void
  mqtlLoading?: boolean
  mqtlData?: any[]
}) => {
  const [threshold, setThreshold] = useState(initialMinAf)
  const [sortMode, setSortMode] = useState(initialSortBy)

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newThreshold = parseFloat(event.target.value)
    setThreshold(newThreshold)
    onMinAfChange(newThreshold)
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
          <LegendItem>
            {' '}
            <span style={{ marginLeft: '5px' }}>
              SNVs (colored by allele)
            </span>
          </LegendItem>
        </LegendItem>
        {false && (
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
          <>
            <label style={{ marginTop: '4px' }}>
              <input
                type='checkbox'
                checked={filterToOutliers}
                onChange={(e) => onFilterToOutliersChange(e.target.checked)}
                style={{ marginRight: '5px' }}
              />
              Filter to outliers
            </label>
            <label style={{ marginTop: '4px', borderTop: '1px solid #ccc', paddingTop: '4px' }}>
              <input
                type='checkbox'
                checked={showMqtl}
                onChange={(e) => onShowMqtlChange(e.target.checked)}
                style={{ marginRight: '5px' }}
              />
              Compute mQTLs
              {mqtlLoading && ' ...'}
            </label>
            {showMqtl && mqtlData && mqtlData.length > 0 && (
              <button
                onClick={() => {
                  const header = 'variant_id,variant_pos,cpg_pos,p_value,effect_size,carrier_count,non_carrier_count\n'
                  const csv = mqtlData.map((d: any) => `${d.variant_id},${d.variant_pos},${d.cpg_pos},${d.p_value},${d.effect_size},${d.carrier_count},${d.non_carrier_count}`).join('\n')
                  const blob = new Blob([header + csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'mqtl_export.csv'
                  a.click()
                }}
                style={{
                  marginTop: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
                  background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '3px',
                }}
              >
                Export {mqtlData.length} mQTLs
              </button>
            )}
            {onLoadAllSamples && (
              <button
                onClick={onLoadAllSamples}
                disabled={methylationLoading}
                style={{
                  marginTop: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  cursor: methylationLoading ? 'wait' : 'pointer',
                  background: methylationLoading ? '#e0e0e0' : '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                }}
              >
                {methylationLoading
                  ? `Loading ${methylationSampleCount}/${methylationTotalSamples}...`
                  : methylationSampleCount > 0 && !methylationLoading
                    ? `Loaded ${methylationSampleCount} samples`
                    : 'Load all samples'}
              </button>
            )}
          </>
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

const SidePanel = styled.div`
  display: flex;
  align-items: flex-start;
  height: 100%;
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
  onLoadAllSamples?: () => void
  methylationLoading?: boolean
  methylationSampleCount?: number
  methylationTotalSamples?: number
  haplotypeLoading?: boolean
  showMqtl?: boolean
  onShowMqtlChange?: (show: boolean) => void
  mqtlLoading?: boolean
  mqtlData?: any[]
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
    const saturation = 60 + (hash % 40)
    const lightness = 30 + (hash % 40)
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

// --- Sub-track components ---

const HaplotypeHeaderTrack = ({
  displayGroups,
  legendProps,
  haplotypeLoading,
  methylationLoading,
  methylationSampleCount,
  methylationTotalSamples,
}: {
  displayGroups: HaplotypeGroup[]
  legendProps: any
  haplotypeLoading: boolean
  methylationLoading: boolean
  methylationSampleCount: number
  methylationTotalSamples: number
}) => {
  const totalSamples = displayGroups.reduce((sum, group) => sum + group.samples.length, 0)
  const totalVariants = new Set(displayGroups.flatMap(g => g.variants.variants.map(v => v.locus))).size

  return (
    <Track
      renderTopPanel={() => <Legend {...legendProps} />}
      renderLeftPanel={() => (
        <SidePanel>
          <svg width={200} height={40}>
            <text x={0} y={15} fontSize='11' fontWeight='bold'>
              LR Haplotypes ({displayGroups.length})
            </text>
            <text x={0} y={30} fontSize='9' fill='#666'>
              {totalSamples} samples, {totalVariants} variants
            </text>
          </svg>
        </SidePanel>
      )}
    >
      {({ width }: { width: number }) => (
        <PlotWrapper>
          {(haplotypeLoading || methylationLoading) && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderBottom: '1px solid #e0e0e0',
              fontSize: '12px',
              color: '#666',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: '2px solid #ccc',
                borderTopColor: '#666',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              {haplotypeLoading && 'Loading haplotype groups...'}
              {!haplotypeLoading && methylationLoading && (
                methylationTotalSamples > 0
                  ? `Loading methylation: ${methylationSampleCount} / ${methylationTotalSamples} samples`
                  : 'Loading methylation data...'
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
          <svg width={width} height={40} />
        </PlotWrapper>
      )}
    </Track>
  )
}

const MethylationSummaryTrack = ({ methylationSummary }: { methylationSummary: MethylationSummaryPoint[] }) => {
  const summaryTrackHeight = 120

  return (
    <Track
      renderLeftPanel={() => {
        const axisTop = 5
        const axisHeight = summaryTrackHeight - 15
        return (
          <SidePanel>
            <svg width={200} height={summaryTrackHeight}>
              <g transform={`translate(110, ${axisTop})`}>
                <text x={-70} y={axisHeight / 2 + 4} fontSize='9' textAnchor='middle' fill='#666'>
                  Summary (%)
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
            </svg>
          </SidePanel>
        )
      }}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number, width: number }) => {
        const summaryMethScale = scaleLinear().domain([0, 100]).range([summaryTrackHeight - 10, 5])
        const HIGH_VARIANCE_THRESHOLD = 20
        return (
          <PlotWrapper>
            <svg height={summaryTrackHeight} width={width}>
              <g>
                <rect x={0} y={0} width={width} height={summaryTrackHeight} fill='#fafafa' stroke='#e0e0e0' />
                {[0, 50, 100].map(tick => (
                  <g key={`summary-tick-${tick}`}>
                    <line x1={0} y1={summaryMethScale(tick)} x2={width} y2={summaryMethScale(tick)} stroke='#eee' />
                  </g>
                ))}
                {methylationSummary.map((d, i) => {
                  const x = scalePosition(d.pos1)
                  const isOutlier = (d.std_methylation || 0) > HIGH_VARIANCE_THRESHOLD
                  const stdVal = d.std_methylation || 0
                  const yMean = summaryMethScale(d.mean_methylation)
                  const yHigh = summaryMethScale(Math.min(100, d.mean_methylation + stdVal))
                  const yLow = summaryMethScale(Math.max(0, d.mean_methylation - stdVal))
                  return (
                    <g key={`summary-${i}`}>
                      <line x1={x} y1={yHigh} x2={x} y2={yLow}
                        stroke={isOutlier ? 'rgba(220, 38, 38, 0.4)' : 'rgba(100, 100, 200, 0.15)'}
                        strokeWidth={isOutlier ? 2 : 1} />
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
                <line x1={0} y1={summaryTrackHeight} x2={width} y2={summaryTrackHeight} stroke='#ccc' />
              </g>
            </svg>
          </PlotWrapper>
        )
      }}
    </Track>
  )
}

const HaplotypeGroupTrack = ({
  group,
  methSampleData,
  start,
  stop,
  colorMode,
  showMethylation,
  summaryByPos,
  haplotypeGroups,
  variantCircleRadius,
  sampleColorScale,
  variantColorScale,
  methylationYScale,
}: {
  group: HaplotypeGroup
  methSampleData: Methylation[]
  start: number
  stop: number
  colorMode: string
  showMethylation: boolean
  summaryByPos: Map<number, { mean: number; std: number }>
  haplotypeGroups: HaplotypeGroup[]
  variantCircleRadius: number
  sampleColorScale: (n: number) => string
  variantColorScale: (n: number) => string
  methylationYScale: (n: number) => number
}) => {
  const methTrackHeight = 40
  const trackHeight = showMethylation ? 20 + methTrackHeight : 20

  // Aggregate per-sample data into per-position group summary
  const groupSummary = React.useMemo(() => {
    if (!showMethylation || methSampleData.length === 0) return []
    const byPos = new Map<number, number[]>()
    for (const d of methSampleData) {
      const arr = byPos.get(d.pos1)
      if (arr) arr.push(d.methylation)
      else byPos.set(d.pos1, [d.methylation])
    }
    return Array.from(byPos.entries()).map(([pos, values]) => {
      const n = values.length
      const mean = values.reduce((a, b) => a + b, 0) / n
      const std = n > 1 ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n) : 0
      return { pos, mean, std, n }
    })
  }, [showMethylation, methSampleData])

  const methYScale = scaleLinear().domain([0, 100]).range([methTrackHeight - 4, 4])

  return (
    <Track
      renderLeftPanel={() => (
        <SidePanel>
          <svg width={200} height={trackHeight}>
            <TooltipAnchor tooltipComponent={() => <HaplotypeGroupTooltip group={group} />}>
              <g>
                <circle cx={5} cy={12.5} r={5} fill={sampleColorScale(group.samples.length)} />
                <text x={15} y={17} fontSize='12'>{group.samples.length}</text>
                <circle cx={50} cy={12.5} r={5} fill={variantColorScale(group.variants.variants.length)} />
                <text x={60} y={17} fontSize='12'>{group.variants.variants.length}</text>

                {showMethylation && (
                  <g transform={`translate(110, 20)`}>
                    <line x1={0} y1={0} x2={0} y2={methTrackHeight} stroke='#999' />
                    {[0, 50, 100].map((tick) => (
                      <g transform={`translate(0, ${methTrackHeight - 4 - (tick / 100) * (methTrackHeight - 8)})`} key={tick}>
                        <line x1={-4} y1={0} x2={0} y2={0} stroke='#999' />
                        <text x={-7} y={3} fontSize='8' textAnchor='end' fill='#666'>{tick}</text>
                      </g>
                    ))}
                  </g>
                )}
              </g>
            </TooltipAnchor>
          </svg>
        </SidePanel>
      )}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number, width: number }) => {
        const startX = scalePosition(start)
        const stopX = scalePosition(stop)
        const groupWidth = stopX - startX

        return (
          <PlotWrapper>
            <svg height={trackHeight} width={width}>
              <g>
                <rect x={startX} y={5} width={groupWidth} height={15} fill='#f0f0f0' stroke='none' />
                <line x1={startX} y1={12.5} x2={stopX} y2={12.5} stroke='#a8a8a8' strokeWidth={1} />

                {group.below_threshold.variants.map((variant: Variant, index: number) => (
                  <TooltipAnchor key={`below-${group.hash}-${index}`} tooltipComponent={() => <VariantTooltip variant={variant} />}>
                    <circle
                      cx={scalePosition(variant.position)} cy={12.5} r={1.5} fill='none'
                      stroke={colorMode === 'allele' ? getColorForVariantByHash(variant.locus) : 'grey'}
                    />
                  </TooltipAnchor>
                ))}

                {group.variants.variants.map((variant: Variant) => {
                  let isDottedLine = false
                  let color
                  if (colorMode === 'allele') color = getColorForVariantByHash(variant.locus)
                  else if (colorMode === 'position') color = getColorForVariantByPosition(variant.position, start, stop)
                  else if (colorMode === 'af') color = getColorForVariantByAf(variant.info_AF[0])
                  else if (colorMode === 'haplotype_count') color = getColorForVariantByHaplotypeCount(haplotypeGroups, variant.locus)

                  if (variant.info_SVTYPE === 'DEL') {
                    isDottedLine = true
                    color = 'rgba(255, 69, 58, 0.8)'
                  } else if (variant.info_SVTYPE === 'INS') {
                    isDottedLine = true
                    color = 'rgba(0, 122, 255, 0.8)'
                  }

                  return (
                    <TooltipAnchor key={`${group.hash}-${variant.locus}`} tooltipComponent={() => <VariantTooltip variant={variant} />}>
                      {isDottedLine ? (
                        <line x1={scalePosition(variant.position)} y1={5} x2={scalePosition(variant.position)} y2={20}
                          stroke={color} strokeDasharray='4 2' strokeWidth={Math.min(5, 2 + (variant.info_SVLEN / 100) * 10)} />
                      ) : (
                        <circle cx={scalePosition(variant.position)} cy={12.5} r={variantCircleRadius} fill={color} stroke='black' />
                      )}
                    </TooltipAnchor>
                  )
                })}
              </g>

              {showMethylation && (
                <g transform={`translate(0, 20)`}>
                  <rect x={startX} y={0} width={groupWidth} height={methTrackHeight} fill='#fafaff' stroke='#e8e8f0' />
                  <line x1={startX} y1={methYScale(50)} x2={stopX} y2={methYScale(50)} stroke='#eee' />
                  {groupSummary.map((d, i) => {
                    const x = scalePosition(d.pos)
                    const popStats = summaryByPos.get(d.pos)
                    const deviation = popStats ? d.mean - popStats.mean : 0
                    const popZScore = popStats && popStats.std > 0 ? deviation / popStats.std : 0

                    const yMean = methYScale(d.mean)
                    const yHigh = methYScale(Math.min(100, d.mean + d.std))
                    const yLow = methYScale(Math.max(0, d.mean - d.std))

                    return (
                      <TooltipAnchor key={`grp-meth-${i}`} tooltipComponent={() => (
                        <RegionAttributeList>
                          <div><dt>Position:</dt><dd>{d.pos}</dd></div>
                          <div><dt>Group mean:</dt><dd>{d.mean.toFixed(1)}%</dd></div>
                          <div><dt>Group std:</dt><dd>{d.std.toFixed(1)}%</dd></div>
                          <div><dt>Samples:</dt><dd>{d.n}</dd></div>
                          {popStats && <div><dt>Pop mean:</dt><dd>{popStats.mean.toFixed(1)}%</dd></div>}
                          {popStats && <div><dt>Deviation:</dt><dd>{deviation > 0 ? '+' : ''}{deviation.toFixed(1)}% (z={popZScore.toFixed(1)})</dd></div>}
                        </RegionAttributeList>
                      )}>
                        <g>
                          <line x1={x} y1={yHigh} x2={x} y2={yLow}
                            stroke='#4a5568' strokeWidth={1} opacity={0.4} />
                          <circle cx={x} cy={yMean} r={2} fill='#4a5568' />
                        </g>
                      </TooltipAnchor>
                    )
                  })}
                </g>
              )}
            </svg>
          </PlotWrapper>
        )
      }}
    </Track>
  )
}

// --- Main component ---

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
  onLoadAllSamples,
  methylationLoading = false,
  methylationSampleCount = 0,
  methylationTotalSamples = 0,
  haplotypeLoading = false,
  showMqtl = false,
  onShowMqtlChange,
  mqtlLoading = false,
  mqtlData = [],
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
        <Track renderLeftPanel={() => (
            <SidePanel>
              <div><span>No haplogroups found</span></div>
            </SidePanel>
          )}>
          {({ width }: { width: number }) => (
            <PlotWrapper>
              <svg height={height} width={width}>
                <text x={width / 2} y={height / 2} dy='0.33rem' textAnchor='middle'>
                  {`There is no haplotype data for this region`}
                </text>
              </svg>
            </PlotWrapper>
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

  const maxSamples = (displayGroups || []).reduce((max, group) => Math.max(max, group.samples.length), 0)
  const maxVariants = (displayGroups || []).reduce((max, group) => Math.max(max, group.variants.variants.length), 0)

  const sampleColorScale = scaleLinear<string>()
    .domain([0, maxSamples === 0 ? 1 : maxSamples])
    .range(['#fee0b6', '#b35806'])

  const variantColorScale = scaleLinear<string>()
    .domain([0, maxVariants === 0 ? 1 : maxVariants])
    .range(['#efefef', '#7f7f7f'])

  const methylationYScale = scaleLinear()
    .domain([0, Math.max(1, ...methylationData.map((d) => d.methylation))])
    .range([65, 35])

  const legendProps = {
    initialMinAf,
    initialSortBy,
    onMinAfChange: handleMinAfChange,
    onColorModeChange: handleColorModeChange,
    onSortModeChange: handleSortModeChange,
    showMethylation,
    onShowMethylationChange: handleShowMethylationChange,
    filterToOutliers,
    onFilterToOutliersChange: setFilterToOutliers,
    onLoadAllSamples,
    methylationLoading,
    methylationSampleCount,
    methylationTotalSamples,
    showMqtl,
    onShowMqtlChange: onShowMqtlChange || (() => {}),
    mqtlLoading,
    mqtlData,
  }

  return (
    <Wrapper style={{ flexDirection: 'column' }}>
      <HaplotypeHeaderTrack
        displayGroups={displayGroups}
        legendProps={legendProps}
        haplotypeLoading={haplotypeLoading}
        methylationLoading={methylationLoading}
        methylationSampleCount={methylationSampleCount}
        methylationTotalSamples={methylationTotalSamples}
      />

      {showMethylation && methylationSummary.length > 0 && (
        <MethylationSummaryTrack methylationSummary={methylationSummary} />
      )}

      {displayGroups.map((group, rowIndex) => {
        const groupSampleIds = new Set(group.samples.map(s => s.sample_id))
        const methSampleData = methylationData.filter(d => groupSampleIds.has(d.sample))
        return (
          <HaplotypeGroupTrack
            key={`haplo-${group.hash}-${rowIndex}`}
            group={group}
            methSampleData={methSampleData}
            start={start}
            stop={stop}
            colorMode={colorMode}
            showMethylation={showMethylation}
            summaryByPos={summaryByPos}
            haplotypeGroups={haplotypeGroups}
            variantCircleRadius={variantCircleRadius}
            sampleColorScale={sampleColorScale}
            variantColorScale={variantColorScale}
            methylationYScale={methylationYScale}
          />
        )
      })}
    </Wrapper>
  )
}

export default HaplotypeTrack
