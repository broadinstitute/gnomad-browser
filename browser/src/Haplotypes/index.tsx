import React, { useState, useCallback, useMemo, forwardRef, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor, Select } from '@gnomad/ui'
import { scaleLinear, scaleLog } from 'd3-scale'
import { SegmentedControl } from '@gnomad/ui'
import { buildPangenomeGraph } from './pangenome-graph'
import { buildVariationGraph } from './variation-graph'
import AlluvialTrack from './AlluvialTrack'
import HeatmapTrack from './HeatmapTrack'
import BubbleTrack from './BubbleTrack'
import HaplotypeHelpButton from './HelpButton'
import { SUPERPOPULATION_COLORS } from './colors'
import { VariantShapeLegend } from '../LongReadVariantPage/VariantLegend'
import { computeDistanceMatrix, buildUPGMATree } from './genealogy-math'
import DeckGLLollipopTrack, { DeckGLLollipopTrackHandle } from './DeckGLLollipopTrack'
import ChromosomePainterTrack from './ChromosomePainterTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

// Extensible plot type and color mode registries
export const PLOT_TYPES: { value: string; label: string }[] = [
  { value: 'lollipop', label: 'Lollipop' },
  { value: 'alluvial', label: 'Alluvial Flow' },
  { value: 'heatmap', label: 'Binned Heatmap' },
  { value: 'bubble', label: 'Variation Graph' },
  { value: 'painting', label: 'Chromosome Painting' },
]

export const COLOR_MODES: { value: string; label: string }[] = [
  { value: 'allele', label: 'Allele' },
  { value: 'position', label: 'Position' },
  { value: 'af', label: 'Allele Frequency' },
  { value: 'haplotype_count', label: 'Haplotype Count' },
  { value: 'population', label: 'Population' },
]

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

const StickyHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
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
  flex-direction: column;
  gap: 6px;
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`

const LegendSection = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid lightgrey;
  border-radius: 5px;
  padding: 4px 6px;
  flex-wrap: wrap;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin-right: 0.75em;
  font-size: 12px;
`
export const Legend = ({
  onMinAfChange = () => { },
  onColorModeChange = () => { },
  colorMode = 'allele',
  initialMinAf = 0,
  initialSortBy = 'similarity_score',
  onSortModeChange = () => { },
  showMethylation = true,
  onShowMethylationChange = () => { },
  filterToOutliers = false,
  onFilterToOutliersChange = () => { },
  onLoadAllSamples,
  methylationLoading = false,
  methylationSampleCount = 0,
  methylationTotalSamples = 0,
  showMqtl = false,
  onShowMqtlChange = () => { },
  mqtlLoading = false,
  mqtlData = [],
  plotType = 'lollipop',
  onPlotTypeChange = () => { },
  plotTypes = PLOT_TYPES,
  colorModes = COLOR_MODES,
  showGenealogy = false,
  onShowGenealogyChange = () => { },
  isClusteredView = false,
  onIsClusteredViewChange = () => { },
  clusterThreshold = 0,
  onClusterThresholdChange = () => { },
  clusterCount = 0,
  minAfFloor = 0,
  minAfCeiling = 1,
}: {
  onMinAfChange?: (threshold: number) => void
  onColorModeChange?: (mode: string) => void
  colorMode?: string
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
  plotType?: string
  onPlotTypeChange?: (plotType: string) => void
  plotTypes?: { value: string; label: string }[]
  colorModes?: { value: string; label: string }[]
  showGenealogy?: boolean
  onShowGenealogyChange?: (show: boolean) => void
  isClusteredView?: boolean
  onIsClusteredViewChange?: (clustered: boolean) => void
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
  clusterCount?: number
  minAfFloor?: number
  minAfCeiling?: number
}) => {
  // Log-scale slider: internal state is 0-100, mapped to log10(minAfFloor)..log10(minAfCeiling)
  const minLog = Math.log10(Math.max(minAfFloor, 0.0001))
  const maxLog = Math.log10(Math.max(minAfCeiling, 0.001))
  const afToSlider = (af: number) => {
    if (maxLog === minLog) return 50
    return ((Math.log10(Math.max(af, minAfFloor)) - minLog) / (maxLog - minLog)) * 100
  }
  const sliderToAf = (val: number) => Math.pow(10, minLog + (val / 100) * (maxLog - minLog))

  const [sliderValue, setSliderValue] = useState(() => afToSlider(initialMinAf))
  const [sortMode, setSortMode] = useState(initialSortBy)
  const threshold = sliderToAf(sliderValue)

  // Sync slider when initialMinAf changes (e.g., auto-derived default on new data)
  const prevInitialMinAf = useRef(initialMinAf)
  useEffect(() => {
    if (initialMinAf !== prevInitialMinAf.current) {
      prevInitialMinAf.current = initialMinAf
      setSliderValue(afToSlider(initialMinAf))
    }
  }, [initialMinAf])

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseFloat(event.target.value))
  }
  const handleThresholdCommit = () => {
    onMinAfChange(sliderToAf(sliderValue))
  }

  const handleSortModeChange = (value: string) => {
    setSortMode(value)
    onSortModeChange(value)
  }

  const handleShowMethylationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const show = event.target.checked
    onShowMethylationChange(show)
  }

  /** Color legend for the current color mode */
  const colorLegend = () => {
    if (colorMode === 'allele') {
      return (
        <LegendItem>
          <svg width={22} height={22}>
            <defs>
              <linearGradient id='rainbow-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                <stop offset='0%' stopColor='hsl(0, 70%, 50%)' />
                <stop offset='50%' stopColor='hsl(180, 70%, 50%)' />
                <stop offset='100%' stopColor='hsl(360, 70%, 50%)' />
              </linearGradient>
            </defs>
            <circle cx={11} cy={11} r={4} fill='url(#rainbow-gradient)' stroke='black' />
          </svg>
          <span>Color = unique allele</span>
        </LegendItem>
      )
    }
    if (colorMode === 'position') {
      return (
        <LegendItem>
          <svg width={60} height={16}>
            <defs>
              <linearGradient id='pos-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                <stop offset='0%' stopColor='hsl(240, 100%, 50%)' />
                <stop offset='100%' stopColor='hsl(0, 100%, 50%)' />
              </linearGradient>
            </defs>
            <rect x={0} y={2} width={60} height={12} fill='url(#pos-gradient)' rx={2} />
          </svg>
          <span style={{ marginLeft: '4px' }}>Position (5&apos;→3&apos;)</span>
        </LegendItem>
      )
    }
    if (colorMode === 'af') {
      return (
        <LegendItem>
          <svg width={80} height={16}>
            <defs>
              <linearGradient id='af-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                <stop offset='0%' stopColor='#d3d3d3' />
                <stop offset='100%' stopColor='#424242' />
              </linearGradient>
            </defs>
            <rect x={0} y={2} width={80} height={12} fill='url(#af-gradient)' rx={2} />
            <text x={2} y={11} fontSize='8' fill='white'>0.1</text>
            <text x={62} y={11} fontSize='8' fill='white'>1.0</text>
          </svg>
          <span style={{ marginLeft: '4px' }}>Allele frequency</span>
        </LegendItem>
      )
    }
    if (colorMode === 'haplotype_count') {
      return (
        <LegendItem>
          <svg width={80} height={16}>
            <defs>
              <linearGradient id='hc-gradient' x1='0%' y1='0%' x2='100%' y2='0%'>
                <stop offset='0%' stopColor='#d3d3d3' />
                <stop offset='100%' stopColor='#ff0000' />
              </linearGradient>
            </defs>
            <rect x={0} y={2} width={80} height={12} fill='url(#hc-gradient)' rx={2} />
            <text x={2} y={11} fontSize='8' fill='#333'>few</text>
            <text x={58} y={11} fontSize='8' fill='white'>many</text>
          </svg>
          <span style={{ marginLeft: '4px' }}>Groups sharing variant</span>
        </LegendItem>
      )
    }
    if (colorMode === 'population') {
      return (
        <>
          {Object.entries(SUPERPOPULATION_COLORS).map(([pop, color]) => (
            <LegendItem key={pop} style={{ marginRight: '0.4em' }}>
              <svg width={12} height={12}>
                <rect x={0} y={0} width={12} height={12} fill={color} rx={2} />
              </svg>
              <span style={{ marginLeft: '2px' }}>{pop}</span>
            </LegendItem>
          ))}
        </>
      )
    }
    return null
  }

  return (
    <LegendWrapper>
      {/* Row 1: Legends */}
      <LegendRow>
        {plotType === 'lollipop' && <VariantShapeLegend />}
        {plotType !== 'heatmap' && (
          <LegendSection>
            <LegendItem><span style={{ fontWeight: 'bold' }}>Color:</span></LegendItem>
            {colorLegend()}
          </LegendSection>
        )}
      </LegendRow>

      {/* Row 2: Controls */}
      <LegendRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Min AF:</label>
          <input
            type='range'
            id='threshold-slider'
            min='0'
            max='100'
            step='1'
            value={sliderValue}
            onChange={handleThresholdChange}
            onPointerUp={handleThresholdCommit}
            onKeyUp={handleThresholdCommit}
            style={{ width: '80px' }}
          />
          <span style={{ fontSize: '12px', minWidth: '40px' }}>
            {threshold < 0.01 ? `${(threshold * 100).toFixed(1)}%` : `${(threshold * 100).toFixed(0)}%`}
          </span>
          <HaplotypeHelpButton title="Minimum Allele Frequency">
            <MinAfHelp />
          </HaplotypeHelpButton>
        </div>
        {plotType === 'lollipop' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '12px' }}>Sort:</label>
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
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px' }}>Plot:</label>
          <Select
            value={plotType}
            onChange={(e: any) => onPlotTypeChange(e.target.value)}
          >
            {plotTypes.map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </Select>
        </div>
        {plotType !== 'heatmap' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '12px' }}>Color:</label>
            <Select
              value={colorMode}
              onChange={(e: any) => onColorModeChange(e.target.value)}
            >
              {colorModes.map((cm) => (
                <option key={cm.value} value={cm.value}>{cm.label}</option>
              ))}
            </Select>
          </div>
        )}
        {plotType === 'lollipop' && (
          <>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={showMethylation}
                  onChange={handleShowMethylationChange}
                />
                Methylation
              </label>
              <HaplotypeHelpButton title="Methylation">
                <MethylationHelp />
              </HaplotypeHelpButton>
            </div>
            {showMethylation && (
              <>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input
                    type='checkbox'
                    checked={filterToOutliers}
                    onChange={(e) => onFilterToOutliersChange(e.target.checked)}
                  />
                  Outliers only
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <input
                    type='checkbox'
                    checked={showMqtl}
                    onChange={(e) => onShowMqtlChange(e.target.checked)}
                  />
                  mQTLs{mqtlLoading && ' ...'}
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
                      padding: '2px 6px', fontSize: '11px', cursor: 'pointer',
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
                      padding: '2px 6px', fontSize: '11px',
                      cursor: methylationLoading ? 'wait' : 'pointer',
                      background: methylationLoading ? '#e0e0e0' : '#f0f0f0',
                      border: '1px solid #ccc', borderRadius: '3px',
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
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={showGenealogy}
                  onChange={(e) => onShowGenealogyChange(e.target.checked)}
                />
                Genealogy tree
              </label>
              <HaplotypeHelpButton title="Genealogy Tree">
                <GenealogyHelp />
              </HaplotypeHelpButton>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={isClusteredView}
                  onChange={(e) => onIsClusteredViewChange(e.target.checked)}
                />
                Clustered view
              </label>
              <HaplotypeHelpButton title="Clustered View">
                <ClusteredViewHelp />
              </HaplotypeHelpButton>
            </div>
            {isClusteredView && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Cluster resolution:</label>
                  <input
                    type='range'
                    min='0'
                    max='1'
                    step='0.01'
                    value={clusterThreshold}
                    onChange={(e) => onClusterThresholdChange(parseFloat(e.target.value))}
                    style={{ width: '80px' }}
                  />
                  <span style={{ fontSize: '12px', minWidth: '28px' }}>{clusterThreshold.toFixed(2)}</span>
                </div>
                {clusterCount > 0 && (
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    {clusterCount} cluster{clusterCount !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </>
        )}
      </LegendRow>
    </LegendWrapper>
  )
}

export type LRVariant = {
  variant_id: string
  chrom: string
  pos: number
  end?: number | null
  ref: string
  alt: string
  allele_type: string
  allele_length: number
  freq: {
    af: number
    ac: number
    an: number
  }
  populations: Array<{ id: string; af: number }>
  rsid: string
  major_consequence?: string | null
  cadd_phred?: number | null
  phylop?: number | null
  filters?: string[] | null
  sv_consequences?: string[] | null
  dbgap_id?: string | null
  tr_id?: string | null
  tr_motifs?: string | null
  gnomad_str?: string | null
  allele_methylation?: number | null
  motif_counts?: number[] | null
  allele_purity?: number | null
  in_samples?: string[]
  gt_phased?: boolean
}

type VariantSet = {
  variants: LRVariant[]
  readable_id: string
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

export type ClusterConsensusVariant = {
  variant: LRVariant
  cluster_af: number
}

export type HaplotypeCluster = {
  cluster_id: string
  sample_count: number
  member_group_hashes: string[]
  consensus_variants: ClusterConsensusVariant[]
}

export type HaplotypeGroups = {
  groups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  tree_json?: string
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

const HaplotypeGroupTooltip = ({ group, sampleMetadata }: { group: HaplotypeGroup; sampleMetadata?: SampleMetadataMap }) => {
  // Compute subpopulation breakdown if metadata is available
  const subpopBreakdown = sampleMetadata && sampleMetadata.size > 0
    ? (() => {
      const counts: Record<string, { sub: string; sup: string; count: number }> = {}
      for (const s of group.samples) {
        const meta = sampleMetadata.get(s.sample_id)
        const sub = meta?.subpopulation || 'N/A'
        const sup = meta?.superpopulation || 'N/A'
        if (!counts[sub]) counts[sub] = { sub, sup, count: 0 }
        counts[sub].count++
      }
      return Object.values(counts).sort((a, b) => b.count - a.count)
    })()
    : null

  return (
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
      {subpopBreakdown && (
        <div style={{ marginTop: '4px' }}>
          <dt style={{ display: 'block', marginBottom: '2px' }}>Population breakdown:</dt>
          <dd style={{ marginLeft: 0 }}>
            {subpopBreakdown.map(({ sub, sup, count }) => (
              <div key={sub} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: 2,
                  background: SUPERPOPULATION_COLORS[sup] || SUPERPOPULATION_COLORS['N/A'],
                }} />
                <span style={{ fontSize: '11px' }}>{sub} ({sup}): {count}</span>
              </div>
            ))}
          </dd>
        </div>
      )}
      <div>
        <dt>Sample IDs:</dt>
        <dd>{group.samples.map((sample) => sample.sample_id).join(', ')}</dd>
      </div>
    </RegionAttributeList>
  )
}

/** Compute population composition of a group's samples */
const getPopulationComposition = (
  samples: Sample[],
  sampleMetadata: SampleMetadataMap,
): Record<string, number> => {
  const counts: Record<string, number> = {}
  for (const s of samples) {
    const meta = sampleMetadata.get(s.sample_id)
    const pop = meta?.superpopulation || 'N/A'
    counts[pop] = (counts[pop] || 0) + 1
  }
  return counts
}

/** Get dominant superpopulation from a population composition */
const getDominantPop = (composition: Record<string, number>): string => {
  let maxPop = 'N/A'
  let maxCount = 0
  for (const [pop, count] of Object.entries(composition)) {
    if (count > maxCount) {
      maxCount = count
      maxPop = pop
    }
  }
  return maxPop
}

/** Population AF mini bar chart for variant tooltip */
const PopulationAfBars = ({ variant }: { variant: LRVariant }) => {
  const pops = (variant.populations || []).map((p) => ({
    key: p.id.toUpperCase() === 'NFE' ? 'EUR' : p.id.toUpperCase(),
    value: p.af,
  }))

  if (pops.length === 0) return null

  const maxAf = Math.max(...pops.map((p) => p.value), 0.01)
  const minAf = Math.min(...pops.map((p) => p.value))
  const isHighlyDifferentiated = maxAf - minAf > 0.2

  return (
    <div style={{ marginTop: '4px' }}>
      <dt style={{ fontWeight: 'bold', marginBottom: '2px' }}>Population AFs:</dt>
      {isHighlyDifferentiated && (
        <span style={{
          display: 'inline-block',
          background: '#d32f2f',
          color: 'white',
          fontSize: '9px',
          padding: '1px 4px',
          borderRadius: '3px',
          marginBottom: '2px',
        }}>Highly Differentiated</span>
      )}
      {pops.map((p) => (
        <div key={p.key} style={{ display: 'flex', alignItems: 'center', marginBottom: '1px' }}>
          <span style={{ width: '28px', fontSize: '9px', fontWeight: 'bold', color: SUPERPOPULATION_COLORS[p.key] }}>{p.key}</span>
          <div style={{ width: '80px', height: '8px', background: '#eee', marginRight: '4px' }}>
            <div style={{ width: `${(p.value / maxAf) * 100}%`, height: '100%', background: SUPERPOPULATION_COLORS[p.key] }} />
          </div>
          <span style={{ fontSize: '9px' }}>{p.value.toFixed(4)}</span>
        </div>
      ))}
    </div>
  )
}

const VariantTooltip = ({ variant }: { variant: LRVariant }) => (
  <RegionAttributeList>
    <div>
      <dt>Position:</dt>
      <dd>{variant.pos}</dd>
    </div>
    <div>
      <dt>Ref:</dt>
      <dd>
        {variant.ref.length > 10
          ? variant.ref.substring(0, 10) + '...'
          : variant.ref}
      </dd>
    </div>
    <div>
      <dt>Alt:</dt>
      <dd>
        {variant.alt.length > 10
          ? variant.alt.substring(0, 10) + '...'
          : variant.alt}
      </dd>
    </div>
    <div>
      <dt>RSID:</dt>
      <dd>{variant.rsid && variant.rsid.length > 10 ? `${variant.rsid.substring(0, 10)}...` : variant.rsid}</dd>
    </div>
    {variant.allele_type && (
      <div>
        <dt>Type:</dt>
        <dd>{variant.allele_type}</dd>
      </div>
    )}
    {variant.allele_length != null && Math.abs(variant.allele_length) > 0 && (
      <div>
        <dt>Length:</dt>
        <dd>{variant.allele_length}bp</dd>
      </div>
    )}
    <div>
      <dt>Allele Frequency:</dt>
      <dd>{variant.freq.af.toFixed(4)}</dd>
    </div>
    <div>
      <dt>Allele Count:</dt>
      <dd>{variant.freq.ac}</dd>
    </div>
    {variant.allele_methylation != null && (
      <div>
        <dt>Allele Methylation:</dt>
        <dd>{variant.allele_methylation.toFixed(2)}</dd>
      </div>
    )}
    <PopulationAfBars variant={variant} />
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
  clusters?: HaplotypeCluster[]
  methylationData: Methylation[]
  methylationSummary?: MethylationSummaryPoint[]
  sampleMetadata?: SampleMetadataMap
  initialMinAf?: number
  initialSortBy?: string
  initialColorMode?: string
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
  mqtlMinLogP?: number
  plotType?: string
  onPlotTypeChange?: (plotType: string) => void
  showGenealogy?: boolean
  onShowGenealogyChange?: (show: boolean) => void
  hoveredVariantPosition?: number | null
  onVisibleGroupChange?: (group: HaplotypeGroup) => void
  isClusteredView?: boolean
  onIsClusteredViewChange?: (clustered: boolean) => void
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  treeJson?: string
  minAfFloor?: number
  minAfCeiling?: number
}

export type HaplotypeTrackHandle = DeckGLLollipopTrackHandle

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

const getColorForVariantByHaplotypeCount = (haplotypeGroups: HaplotypeGroup[], variantId: string) => {
  const count = haplotypeGroups.reduce(
    (acc, group) =>
      acc + (group.variants.variants.some((variant) => variant.variant_id === variantId) ? 1 : 0),
    0
  )
  const haplotypeCountScale = scaleLinear<string>()
    .domain([0, haplotypeGroups.length])
    .range(['#d3d3d3', '#ff0000'])
    .clamp(true)
  return haplotypeCountScale(count)
}

// --- Help content ---

const LollipopHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The lollipop view shows each haplotype group as a horizontal row with colored markers
      at each variant position. Groups are clusters of haplotypes that share the same set of
      variants above the allele frequency threshold.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong>Each row</strong> is one haplotype group — a set of samples that share the same phased variant combination.</li>
      <li><strong>Colored circles</strong> are SNVs. Color encodes the allele identity (each unique allele gets a consistent color).</li>
      <li><strong>Blue dashed lines</strong> are indels (insertions/deletions). Thickness scales with variant length.</li>
      <li><strong>Red dashed lines</strong> are structural variants (SVs).</li>
      <li><strong>Small open circles</strong> are variants below the current AF threshold (shown for context but not used for grouping).</li>
      <li><strong>Gray background bar</strong> spans the start-to-stop range of the group's variants.</li>
    </ul>

    <h4>Left Panel Labels</h4>
    <ul>
      <li><strong>Orange circle + number</strong> — Sample count (how many haplotypes in this group)</li>
      <li><strong>Gray circle + number</strong> — Variant count (how many variant sites above threshold)</li>
      <li>Hover to see full details including sample IDs and genomic coordinates.</li>
    </ul>

    <h4>Optional Overlays</h4>
    <ul>
      <li><strong>Methylation</strong> — When enabled, each group shows per-CpG methylation levels as dots below the variant row. Deviation from the population mean is highlighted.</li>
      <li><strong>mQTLs</strong> — When computed, arc connections show variant-CpG associations. Arc height encodes statistical significance (-log₁₀ p). Red arcs = positive effect, blue = negative.</li>
    </ul>

    <h4>Controls</h4>
    <ul>
      <li><strong>Minimum variant AF</strong> — Filters variants by allele frequency. Raising this simplifies groups by ignoring rare variants.</li>
      <li><strong>Sort by</strong> — "Similarity" groups similar haplotypes together; "Count" sorts by sample count.</li>
      <li><strong>Filter to outliers</strong> — When methylation is enabled, shows only groups containing methylation outlier samples.</li>
    </ul>
  </>
)

const MinAfHelp = () => (
  <>
    <p>
      This slider filters out rare variants before grouping haplotypes together.
      Because groups in this view are strictly defined by identical sets of variants,
      keeping rare or sample-specific variants can fragment your data into many tiny,
      highly specific groups. Raising the threshold ignores these rare variants, allowing
      samples to coalesce into major ancestral haplotype blocks defined by common variants.
    </p>
    <p>
      The rare variants aren't hidden completely — they remain visible as small open circles
      on each group's track so you can still spot them without them breaking up the group.
      Keep in mind that adjusting this slider recalculates the underlying groups, which will
      also completely rebuild the genealogical tree and clusters.
    </p>
  </>
)

const MethylationHelp = () => (
  <>
    <p>
      Enabling this toggle overlays per-CpG methylation data directly beneath each haplotype
      group. Because long-read sequencing captures both genetic variants and 5mC epigenetic
      modifications on the same reads, this lets you visually identify allele-specific
      methylation (ASM) where specific structural haplotypes drive local hyper- or
      hypo-methylation.
    </p>
    <p>
      You'll see a track of dots representing the group's mean methylation level at each CpG
      site. Sites that deviate significantly from the overall population mean are highlighted
      in red, flagging potential haplotype-driven epigenetic effects. If you check "Outliers
      only," the view will filter down to groups containing samples that exhibit high regional
      methylation variance.
    </p>
  </>
)

const GenealogyHelp = () => (
  <>
    <p>
      This displays a hierarchical clustering tree that maps out the evolutionary and structural
      relationships between the haplotype groups on the screen. When activated, the rows
      automatically reorder themselves to match the tree topology, placing closely related
      groups next to each other and preventing branches from crossing.
    </p>
    <p>
      Behind the scenes, the tree is built using UPGMA clustering based on the pairwise Jaccard
      distance of structural variants (SVs) and tandem repeats (TRs) exclusively. Because
      structural variants mutate much more slowly than SNVs, they provide a highly stable
      scaffold for tracing deep ancestral relationships without being skewed by background
      mutation noise. If you are also using the clustered view, a vertical threshold line will
      appear on the tree that you can drag to adjust your cluster resolution.
    </p>
  </>
)

const ClusteredViewHelp = () => (
  <>
    <p>
      The clustered view simplifies complex regions by collapsing closely related haplotype
      groups into broader macro-clusters. It works by cutting the genealogical tree at a
      specific genetic distance, grouping together haplotypes that share a highly similar
      structural backbone even if they differ slightly by minor SNVs.
    </p>
    <p>
      Instead of individual groups, you'll see a single row for each cluster displaying its
      consensus variants. The opacity of these variants scales with their frequency in the
      cluster — fading out if present in only half the samples, and appearing completely solid
      if shared by nearly all.
    </p>
    <p>
      You can use the cluster resolution slider to decide where to cut the tree; moving it to
      the right merges more distant groups together. Click the arrow next to a cluster to
      expand it and inspect the exact constituent groups indented inside.
    </p>
  </>
)

const AutoTunedHelp = () => (
  <>
    <p>
      The minimum allele frequency threshold and cluster resolution were automatically
      calculated based on the size of this genomic region. Larger regions use a higher
      AF threshold to filter out rare variants and reduce visual complexity, and a higher
      cluster resolution to consolidate major ancestral haplotype blocks.
    </p>
    <p>
      These defaults are designed to give a useful overview on first load. Once you
      manually adjust either the Min AF slider or the Cluster resolution slider, this
      indicator disappears — you've taken ownership of the settings.
    </p>
  </>
)

// --- Info bar component ---

const InfoBarWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  color: #333;
  gap: 12px;
`

const HaplotypeInfoBar = ({
  displayGroups,
  start,
  stop,
  threshold,
  isClusteredView,
  clusterCount,
  haplotypeLoading,
  methylationLoading,
  methylationSampleCount,
  methylationTotalSamples,
  isAutoTuned,
}: {
  displayGroups: HaplotypeGroup[]
  start: number
  stop: number
  threshold: number
  isClusteredView: boolean
  clusterCount: number
  haplotypeLoading: boolean
  methylationLoading: boolean
  methylationSampleCount: number
  methylationTotalSamples: number
  isAutoTuned: boolean
}) => {
  const { totalSamples, totalVariants } = React.useMemo(() => {
    let samples = 0
    const loci = new Set<string>()
    for (const group of displayGroups) {
      samples += group.samples.length
      for (const v of group.variants.variants) {
        loci.add(v.variant_id)
      }
    }
    return { totalSamples: samples, totalVariants: loci.size }
  }, [displayGroups])

  const regionSize = stop - start
  const regionLabel = regionSize >= 1000
    ? `${(regionSize / 1000).toFixed(regionSize >= 10000 ? 0 : 1)} kb`
    : `${regionSize.toLocaleString()} bp`

  const thresholdLabel = threshold < 0.01
    ? `${(threshold * 100).toFixed(1)}%`
    : `${(threshold * 100).toFixed(0)}%`

  const isLoading = haplotypeLoading || methylationLoading

  return (
    <InfoBarWrapper>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span><strong>{totalSamples.toLocaleString()}</strong> haplotypes</span>
        <span style={{ color: '#999' }}>·</span>
        <span><strong>{totalVariants.toLocaleString()}</strong> variants</span>
        <span style={{ color: '#999' }}>·</span>
        <span>{regionLabel}</span>
        <span style={{ color: '#999' }}>·</span>
        <span>{isClusteredView ? `Clustered (${clusterCount})` : 'Unclustered'}</span>
        <span style={{ color: '#999' }}>·</span>
        <span>Min AF: {thresholdLabel}</span>
        {isAutoTuned && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <HaplotypeHelpButton title="Auto-Tuned Defaults">
                <AutoTunedHelp />
              </HaplotypeHelpButton>
              <span style={{ color: '#888', fontSize: '11px', fontStyle: 'italic' }}>
                Auto-tuned for region size
              </span>
            </span>
          </>
        )}
      </div>
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', flexShrink: 0 }}>
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid #ccc',
            borderTopColor: '#666',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          {haplotypeLoading && 'Loading haplotypes...'}
          {!haplotypeLoading && methylationLoading && (
            methylationTotalSamples > 0
              ? `Loading methylation: ${methylationSampleCount}/${methylationTotalSamples}`
              : 'Loading methylation...'
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </InfoBarWrapper>
  )
}

// --- Sub-track components ---

const HaplotypeHeaderTrack = ({
  legendProps,
}: {
  legendProps: any
}) => {
  return (
    <Track
      renderTopPanel={() => <Legend {...legendProps} />}
      renderLeftPanel={() => (
        <SidePanel>
          <div style={{ width: 200, padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#666', fontWeight: 'bold' }}>
              <span style={{ width: '45px' }}>Samples</span>
              <span>Variants</span>
            </div>
          </div>
        </SidePanel>
      )}
    >
      {() => <div style={{ height: 1 }} />}
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
                            {isOutlier && <div><dt style={{ color: '#dc2626' }}>High variance site</dt><dd></dd></div>}
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
  mqtlData = [],
  showMqtl = false,
  mqtlMinLogP = 0,
  sampleMetadata,
  hoveredVariantPosition,
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
  mqtlData?: any[]
  showMqtl?: boolean
  mqtlMinLogP?: number
  sampleMetadata?: SampleMetadataMap
  hoveredVariantPosition?: number | null
}) => {
  const mqtlTrackHeight = 80
  const methTrackHeight = 40
  const showGroupMqtl = showMqtl && mqtlData.length > 0

  // Filter mQTL data to associations involving variants in this group
  const groupMqtl = React.useMemo(() => {
    if (!showGroupMqtl) return []
    const minP = mqtlMinLogP || 0
    const groupVariantPositions = new Set(
      group.variants.variants.map((v: LRVariant) => v.pos)
    )
    return mqtlData.filter((d: any) =>
      groupVariantPositions.has(d.variant_pos) && -Math.log10(d.p_value) >= minP
    )
  }, [showGroupMqtl, mqtlData, group.variants.variants, mqtlMinLogP])

  const mqtlPad = 8
  const trackHeight = (showMethylation ? 20 + methTrackHeight : 20) + (showGroupMqtl && groupMqtl.length > 0 ? mqtlPad + mqtlTrackHeight : 0)

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

  // Population composition for this group
  const popComposition = React.useMemo(() => {
    if (!sampleMetadata || sampleMetadata.size === 0) return null
    return getPopulationComposition(group.samples, sampleMetadata)
  }, [group.samples, sampleMetadata])

  const dominantPop = popComposition ? getDominantPop(popComposition) : 'N/A'
  const dominantColor = SUPERPOPULATION_COLORS[dominantPop] || SUPERPOPULATION_COLORS['N/A']

  return (
    <Track
      renderLeftPanel={() => (
        <SidePanel>
          <svg width={200} height={trackHeight}>
            <TooltipAnchor tooltipComponent={() => <HaplotypeGroupTooltip group={group} sampleMetadata={sampleMetadata} />}>
              <g>
                {colorMode === 'population' && popComposition ? (() => {
                  // Stacked bar showing population proportions
                  const totalSamples = group.samples.length
                  const barWidth = 80
                  const barX = 5
                  const barY = 5
                  const barH = 10
                  const sortedPops = Object.entries(popComposition).sort((a, b) => b[1] - a[1])
                  let accX = barX
                  return (
                    <>
                      {sortedPops.map(([pop, count]) => {
                        const w = (count / totalSamples) * barWidth
                        const x = accX
                        accX += w
                        return (
                          <rect
                            key={pop}
                            x={x} y={barY} width={w} height={barH}
                            fill={SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A']}
                            stroke="white" strokeWidth={0.5}
                          />
                        )
                      })}
                      <text x={barX + barWidth + 4} y={barY + barH - 1} fontSize='9' fill='#333'>
                        {totalSamples}
                      </text>
                      <circle cx={barX + barWidth + 28} cy={barY + barH / 2} r={4} fill={variantColorScale(group.variants.variants.length)} />
                      <text x={barX + barWidth + 36} y={barY + barH - 1} fontSize='9' fill='#333'>
                        {group.variants.variants.length}
                      </text>
                    </>
                  )
                })() : (
                  <>
                    <circle cx={5} cy={12.5} r={5} fill={sampleColorScale(group.samples.length)} />
                    <text x={15} y={17} fontSize='12'>{group.samples.length}</text>
                    <circle cx={50} cy={12.5} r={5} fill={variantColorScale(group.variants.variants.length)} />
                    <text x={60} y={17} fontSize='12'>{group.variants.variants.length}</text>
                  </>
                )}

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
                {showGroupMqtl && groupMqtl.length > 0 && (() => {
                  const mqtlYOffset = (showMethylation ? 20 + methTrackHeight : 20) + mqtlPad
                  const grpMaxLogP = Math.max(2, ...groupMqtl.map((d: any) => -Math.log10(d.p_value)))
                  const tickVals = grpMaxLogP <= 5
                    ? [0, Math.round(grpMaxLogP)]
                    : [0, Math.round(grpMaxLogP / 2), Math.round(grpMaxLogP)]
                  return (
                    <g transform={`translate(110, ${mqtlYOffset})`}>
                      <line x1={0} y1={0} x2={0} y2={mqtlTrackHeight} stroke='#999' />
                      {tickVals.map((v) => {
                        const y = mqtlTrackHeight - (v / grpMaxLogP) * (mqtlTrackHeight - 4)
                        return (
                          <g key={`mqtl-tick-${v}`}>
                            <line x1={-4} y1={y} x2={0} y2={y} stroke='#999' />
                            <text x={-7} y={y + 3} fontSize='7' textAnchor='end' fill='#666'>{v}</text>
                          </g>
                        )
                      })}
                      <text x={-30} y={mqtlTrackHeight / 2} fontSize='7' textAnchor='middle'
                        fill='#999' transform={`rotate(-90, -30, ${mqtlTrackHeight / 2})`}>
                        -log₁₀(p)
                      </text>
                    </g>
                  )
                })()}
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
                <rect
                  x={startX} y={5} width={groupWidth} height={15}
                  fill={colorMode === 'population' && popComposition ? dominantColor : '#f0f0f0'}
                  opacity={colorMode === 'population' && popComposition ? 0.15 : 1}
                  stroke='none'
                />
                <line x1={startX} y1={12.5} x2={stopX} y2={12.5} stroke='#a8a8a8' strokeWidth={1} />

                {group.below_threshold.variants.map((variant: LRVariant, index: number) => {
                  const bx = scalePosition(variant.pos)
                  const bType = (variant.allele_type || '').toLowerCase()
                  const bColor = colorMode === 'allele' ? getColorForVariantByHash(variant.variant_id) : 'grey'
                  return (
                    <TooltipAnchor key={`below-${group.hash}-${index}`} tooltipComponent={() => <VariantTooltip variant={variant} />}>
                      {bType === 'del' ? (
                        <line x1={bx} y1={8} x2={bx} y2={17} stroke={bColor} strokeDasharray='2 2' strokeWidth={1} opacity={0.4} />
                      ) : bType === 'ins' || bType === 'alu_ins' || bType === 'sva_ins' ? (
                        <path d={`M ${bx} ${12.5 - 3} L ${bx - 2.5} ${12.5 + 2.5} L ${bx + 2.5} ${12.5 + 2.5} Z`} fill='none' stroke={bColor} strokeWidth={0.7} opacity={0.5} />
                      ) : bType === 'dup' || bType === 'dup_interspersed' || bType === 'complex_dup' || bType === 'inv_dup' ? (
                        <path d={`M ${bx} ${12.5 - 3} L ${bx - 2.5} ${12.5} L ${bx} ${12.5 + 3} L ${bx + 2.5} ${12.5} Z`} fill='none' stroke={bColor} strokeWidth={0.7} opacity={0.5} />
                      ) : bType === 'trv' ? (
                        <rect x={bx - 3} y={12.5 - 2.5} width={6} height={5} fill='none' stroke={bColor} strokeWidth={0.7} rx={1} opacity={0.5} />
                      ) : (
                        <circle cx={bx} cy={12.5} r={1.5} fill='none' stroke={bColor} strokeWidth={0.7} />
                      )}
                    </TooltipAnchor>
                  )
                })}

                {group.variants.variants.map((variant: LRVariant, variantIndex: number) => {
                  // Determine color from the active color mode
                  let color: string
                  if (colorMode === 'allele') color = getColorForVariantByHash(variant.variant_id)
                  else if (colorMode === 'position') color = getColorForVariantByPosition(variant.pos, start, stop)
                  else if (colorMode === 'af') color = getColorForVariantByAf(variant.freq.af)
                  else if (colorMode === 'haplotype_count') color = getColorForVariantByHaplotypeCount(haplotypeGroups, variant.variant_id)
                  else color = '#333'

                  // Determine variant category by allele_type
                  const vType = (variant.allele_type || '').toLowerCase()
                  const x = scalePosition(variant.pos)

                  return (
                    <TooltipAnchor key={`${group.hash}-${variant.variant_id}-${variantIndex}`} tooltipComponent={() => <VariantTooltip variant={variant} />}>
                      {vType === 'del' ? (
                        // Deletion: dashed line, thickness scales with length
                        <line x1={x} y1={5} x2={x} y2={20}
                          stroke={color} strokeDasharray='4 2'
                          strokeWidth={Math.min(5, 2 + (Math.abs(variant.allele_length || 0) / 100) * 3)} />
                      ) : vType === 'ins' || vType === 'alu_ins' || vType === 'sva_ins' ? (
                        // Insertion: upward triangle
                        <path
                          d={`M ${x} ${12.5 - 5} L ${x - 4} ${12.5 + 4} L ${x + 4} ${12.5 + 4} Z`}
                          fill={color} opacity={0.8} stroke={color} strokeWidth={0.5}
                        />
                      ) : vType === 'dup' || vType === 'dup_interspersed' || vType === 'complex_dup' || vType === 'inv_dup' ? (
                        // Duplication: diamond
                        <path
                          d={`M ${x} ${12.5 - 5} L ${x - 4} ${12.5} L ${x} ${12.5 + 5} L ${x + 4} ${12.5} Z`}
                          fill={color} opacity={0.7} stroke={color} strokeWidth={0.5}
                        />
                      ) : vType === 'inv' ? (
                        // Inversion: rotated square
                        <rect
                          x={x - 3.5} y={12.5 - 3.5} width={7} height={7}
                          fill={color} opacity={0.7} stroke={color} strokeWidth={0.5}
                          transform={`rotate(45, ${x}, 12.5)`}
                        />
                      ) : vType === 'trv' ? (
                        // Tandem repeat: rounded rect with tick marks
                        <g>
                          <rect
                            x={x - 5} y={12.5 - 4} width={10} height={8}
                            fill={color} opacity={0.8} rx={1.5}
                            stroke={color} strokeWidth={0.5}
                          />
                          <line x1={x - 1.5} y1={12.5 - 4} x2={x - 1.5} y2={12.5 + 4} stroke='white' strokeWidth={0.7} opacity={0.6} />
                          <line x1={x + 1.5} y1={12.5 - 4} x2={x + 1.5} y2={12.5 + 4} stroke='white' strokeWidth={0.7} opacity={0.6} />
                        </g>
                      ) : (
                        // SNV / other: circle
                        <circle cx={x} cy={12.5} r={variantCircleRadius} fill={color} stroke='black' strokeWidth={0.5} />
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

              {/* Per-group mini mQTL arcs */}
              {showGroupMqtl && groupMqtl.length > 0 && (() => {
                const mqtlYOffset = (showMethylation ? 20 + methTrackHeight : 20) + mqtlPad
                const mqtlMaxLogP = Math.max(2, ...groupMqtl.map((d: any) => -Math.log10(d.p_value)))
                const mqtlHScale = scaleLinear().domain([0, mqtlMaxLogP]).range([0, mqtlTrackHeight - 4])
                const mqtlBaseline = mqtlYOffset + mqtlTrackHeight

                return (
                  <g>
                    <rect x={startX} y={mqtlYOffset} width={groupWidth} height={mqtlTrackHeight} fill='#fafafa' stroke='#e8e8e8' />
                    <line x1={startX} y1={mqtlBaseline} x2={stopX} y2={mqtlBaseline} stroke='#ddd' strokeWidth={0.5} />
                    {groupMqtl
                      .slice()
                      .sort((a: any, b: any) => b.p_value - a.p_value)
                      .map((d: any, i: number) => {
                        const vx = scalePosition(d.variant_pos)
                        const cx2 = scalePosition(d.cpg_pos)
                        const logP = -Math.log10(d.p_value)
                        const arcH = mqtlHScale(logP)
                        const midX = (vx + cx2) / 2
                        const midY = mqtlBaseline - arcH
                        const pathData = `M ${vx} ${mqtlBaseline} Q ${midX} ${midY} ${cx2} ${mqtlBaseline}`
                        const opacity = Math.min(0.8, 0.2 + (logP / mqtlMaxLogP) * 0.6)
                        const baseColor = d.effect_size > 0 ? '220, 38, 38' : '37, 99, 235'

                        return (
                          <TooltipAnchor
                            key={`grp-mqtl-${i}`}
                            tooltipComponent={() => (
                              <RegionAttributeList>
                                <div><dt>Variant:</dt><dd>{d.variant_id}</dd></div>
                                <div><dt>CpG:</dt><dd>{d.cpg_pos.toLocaleString()}</dd></div>
                                <div><dt>p-value:</dt><dd>{d.p_value.toExponential(2)}</dd></div>
                                <div><dt>Effect:</dt><dd>{d.effect_size > 0 ? '+' : ''}{d.effect_size.toFixed(1)}%</dd></div>
                              </RegionAttributeList>
                            )}
                          >
                            <path d={pathData} fill='none' stroke={`rgba(${baseColor}, ${opacity})`} strokeWidth={1.5} />
                          </TooltipAnchor>
                        )
                      })}
                  </g>
                )
              })()}

              {hoveredVariantPosition != null && (
                <line
                  x1={scalePosition(hoveredVariantPosition)}
                  y1={0}
                  x2={scalePosition(hoveredVariantPosition)}
                  y2={trackHeight}
                  stroke="black"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  opacity={0.5}
                  pointerEvents="none"
                />
              )}
            </svg>
          </PlotWrapper>
        )
      }}
    </Track>
  )
}

// --- Main component ---

const HaplotypeTrack = forwardRef<HaplotypeTrackHandle, HaplotypeTrackProps>(function HaplotypeTrack({
  height = 500,
  haplotypeGroups,
  clusters,
  methylationData,
  methylationSummary = [],
  sampleMetadata,
  start,
  stop,
  initialMinAf = 0,
  initialColorMode = 'allele',
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
  mqtlMinLogP = 0,
  plotType = 'lollipop',
  onPlotTypeChange,
  showGenealogy = false,
  onShowGenealogyChange,
  hoveredVariantPosition,
  onVisibleGroupChange,
  isClusteredView = false,
  onIsClusteredViewChange,
  clusterThreshold = 0,
  onClusterThresholdChange,
  expandedClusterIds,
  toggleClusterExpansion,
  treeJson,
  minAfFloor = 0,
  minAfCeiling = 1,
}, ref) {
  const [colorMode, setColorMode] = useState(initialColorMode)
  const [threshold, setThreshold] = useState(initialMinAf)
  const [sortMode, setSortMode] = useState(initialSortBy)
  const [showMethylation, setShowMethylation] = useState(false)
  const [filterToOutliers, setFilterToOutliers] = useState(true)
  const [isAutoTuned, setIsAutoTuned] = useState(true)

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
      setIsAutoTuned(false)
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
  const filteredGroups = outlierSampleIds
    ? haplotypeGroups.filter(g => g.samples.some(s => outlierSampleIds.has(s.sample_id)))
    : haplotypeGroups

  // UPGMA genealogy tree computation — prefer backend tree_json when available
  const genealogyResult = useMemo(() => {
    if (!showGenealogy || filteredGroups.length < 2) return null

    // Backend tree: parse tree_json (groupHash is string in backend TreeNode)
    if (treeJson) {
      try {
        const backendTree = JSON.parse(treeJson) as import('./genealogy-math').TreeNode
        // Iterative in-order traversal: extract leaf order and normalize groupHash in-place
        const leafOrder: number[] = []
        const stack: import('./genealogy-math').TreeNode[] = []
        let current: import('./genealogy-math').TreeNode | null = backendTree

        while (current || stack.length > 0) {
          while (current) {
            stack.push(current)
            current = current.left
          }
          current = stack.pop()!

          if (current.groupHash !== null) {
            current.groupHash = typeof current.groupHash === 'string'
              ? parseInt(current.groupHash as unknown as string, 10)
              : current.groupHash
            leafOrder.push(current.groupHash)
          }
          current = current.right
        }

        return { tree: backendTree, leafOrder }
      } catch (e) {
        console.warn('[genealogy] Failed to parse backend tree_json, falling back to local UPGMA', e)
      }
    }

    // Fallback: compute locally
    console.time(`[perf] genealogy (${filteredGroups.length} groups)`)
    console.time('[perf] computeDistanceMatrix')
    const distMatrix = computeDistanceMatrix(filteredGroups)
    console.timeEnd('[perf] computeDistanceMatrix')
    console.time('[perf] buildUPGMATree')
    const { tree, leafOrder } = buildUPGMATree(distMatrix, filteredGroups)
    console.timeEnd('[perf] buildUPGMATree')
    console.timeEnd(`[perf] genealogy (${filteredGroups.length} groups)`)
    return { tree, leafOrder }
  }, [showGenealogy, filteredGroups, treeJson])

  // When genealogy is active, reorder groups to match leaf order (prevents branch crossing)
  const displayGroups = useMemo(() => {
    if (!showGenealogy || !genealogyResult) return filteredGroups
    const orderMap = new Map<number, number>()
    genealogyResult.leafOrder.forEach((hash, idx) => orderMap.set(hash, idx))
    return [...filteredGroups].sort((a, b) => (orderMap.get(a.hash) ?? 0) - (orderMap.get(b.hash) ?? 0))
  }, [showGenealogy, genealogyResult, filteredGroups])

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

  const maxSamples = useMemo(
    () => (displayGroups || []).reduce((max, group) => Math.max(max, group.samples.length), 0),
    [displayGroups]
  )
  const maxVariants = useMemo(
    () => (displayGroups || []).reduce((max, group) => Math.max(max, group.variants.variants.length), 0),
    [displayGroups]
  )

  const sampleColorScale = useMemo(
    () => scaleLinear<string>().domain([0, maxSamples === 0 ? 1 : maxSamples]).range(['#fee0b6', '#b35806']),
    [maxSamples]
  )

  const variantColorScale = useMemo(
    () => scaleLinear<string>().domain([0, maxVariants === 0 ? 1 : maxVariants]).range(['#efefef', '#7f7f7f']),
    [maxVariants]
  )

  const methylationYScale = scaleLinear()
    .domain([0, Math.max(1, ...methylationData.map((d) => d.methylation))])
    .range([65, 35])

  const legendProps = {
    initialMinAf,
    initialSortBy,
    onMinAfChange: handleMinAfChange,
    onColorModeChange: handleColorModeChange,
    colorMode,
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
    onShowMqtlChange: onShowMqtlChange || (() => { }),
    mqtlLoading,
    mqtlData,
    plotType,
    onPlotTypeChange: onPlotTypeChange || (() => { }),
    showGenealogy,
    onShowGenealogyChange: onShowGenealogyChange || (() => { }),
    isClusteredView,
    onIsClusteredViewChange: onIsClusteredViewChange || (() => { }),
    clusterThreshold,
    onClusterThresholdChange: (t: number) => {
      setIsAutoTuned(false)
      ;(onClusterThresholdChange || (() => { }))(t)
    },
    clusterCount: clusters?.length || 0,
    minAfFloor,
    minAfCeiling,
  }

  // Build pangenome graph for alluvial/heatmap views
  const pangenomeGraph = useMemo(() => {
    if (plotType !== 'alluvial' && plotType !== 'heatmap') return null
    if (!displayGroups.length) return null
    return buildPangenomeGraph(displayGroups, start, stop)
  }, [plotType, displayGroups, start, stop])

  // Build variation graph for bubble view
  const variationGraph = useMemo(() => {
    if (plotType !== 'bubble' || !displayGroups.length) return null
    return buildVariationGraph(displayGroups, start, stop)
  }, [plotType, displayGroups, start, stop])

  return (
    <Wrapper style={{ flexDirection: 'column' }}>
      <StickyHeader>
        <HaplotypeHeaderTrack legendProps={legendProps} />
        <HaplotypeInfoBar
          displayGroups={displayGroups}
          start={start}
          stop={stop}
          threshold={threshold}
          isClusteredView={isClusteredView}
          clusterCount={clusters?.length || 0}
          haplotypeLoading={haplotypeLoading}
          methylationLoading={methylationLoading}
          methylationSampleCount={methylationSampleCount}
          methylationTotalSamples={methylationTotalSamples}
          isAutoTuned={isAutoTuned}
        />
      </StickyHeader>

      {plotType === 'lollipop' && (
        <>
          <Track
            renderLeftPanel={() => (
              <SidePanel>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>Lollipop View</span>
                  <HaplotypeHelpButton title="Lollipop View — How to Read This View">
                    <LollipopHelp />
                  </HaplotypeHelpButton>
                </div>
              </SidePanel>
            )}
          >
            {() => <div style={{ height: 1 }} />}
          </Track>
          {showMethylation && methylationSummary.length > 0 && (
            <MethylationSummaryTrack methylationSummary={methylationSummary} />
          )}

          <DeckGLLollipopTrack
            ref={ref}
            displayGroups={displayGroups}
            haplotypeGroups={haplotypeGroups}
            clusters={clusters}
            start={start}
            stop={stop}
            colorMode={colorMode}
            showMethylation={showMethylation}
            methylationData={methylationData}
            summaryByPos={summaryByPos}
            variantCircleRadius={variantCircleRadius}
            sampleColorScale={sampleColorScale}
            variantColorScale={variantColorScale}
            mqtlData={mqtlData}
            showMqtl={showMqtl}
            mqtlMinLogP={mqtlMinLogP}
            sampleMetadata={sampleMetadata}
            hoveredVariantPosition={hoveredVariantPosition}
            showGenealogy={showGenealogy}
            genealogyResult={genealogyResult}
            onVisibleGroupChange={onVisibleGroupChange}
            isClusteredView={isClusteredView}
            expandedClusterIds={expandedClusterIds}
            toggleClusterExpansion={toggleClusterExpansion}
            clusterThreshold={clusterThreshold}
            onClusterThresholdChange={onClusterThresholdChange}
          />
        </>
      )}

      {plotType === 'alluvial' && pangenomeGraph && (
        <AlluvialTrack graph={pangenomeGraph} colorMode={colorMode} sampleMetadata={sampleMetadata} />
      )}

      {plotType === 'heatmap' && pangenomeGraph && (
        <HeatmapTrack graph={pangenomeGraph} />
      )}

      {plotType === 'bubble' && variationGraph && (
        <BubbleTrack graph={variationGraph} colorMode={colorMode} sampleMetadata={sampleMetadata} />
      )}

      {plotType === 'painting' && (
        <ChromosomePainterTrack
          displayGroups={displayGroups}
          haplotypeGroups={haplotypeGroups}
          clusters={clusters}
          start={start}
          stop={stop}
          sampleColorScale={sampleColorScale}
          variantColorScale={variantColorScale}
          sampleMetadata={sampleMetadata}
          isClusteredView={isClusteredView}
          expandedClusterIds={expandedClusterIds}
          toggleClusterExpansion={toggleClusterExpansion}
          showGenealogy={showGenealogy}
          genealogyResult={genealogyResult}
          clusterThreshold={clusterThreshold}
          onClusterThresholdChange={onClusterThresholdChange}
        />
      )}
    </Wrapper>
  )
})

export default HaplotypeTrack
