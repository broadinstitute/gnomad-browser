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
import { ALLELE_TYPE_COLORS, VARIANT_CATEGORY_COLORS, type VariantCategory } from '../LongReadVariantPage/variantUtils'
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
  { value: 'sv_type', label: 'Variant Type' },
  { value: 'allele', label: 'Allele Fingerprint' },
  { value: 'position', label: 'Position' },
  { value: 'af', label: 'Allele Frequency' },
  { value: 'haplotype_count', label: 'Haplotype Count' },
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

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
`

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`

const FieldsetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Fieldset = styled.fieldset<{ $disabled?: boolean }>`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 0;
  background: transparent;
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  pointer-events: ${(p) => (p.$disabled ? 'none' : 'auto')};
`

const FieldsetTitle = styled.legend`
  font-size: 12px;
  font-weight: 600;
  color: #555;
  padding: 0 4px;
`

// Compact shapes that render each variant category using its actual color
const COMPACT_COLORED_SHAPES: Record<VariantCategory, React.ReactNode> = {
  snv: <circle cx={7} cy={7} r={3.5} fill={VARIANT_CATEGORY_COLORS.snv} stroke="#333" strokeWidth={0.4} />,
  insertion: <path d="M 7 2 L 3 12 L 11 12 Z" fill={VARIANT_CATEGORY_COLORS.insertion} />,
  deletion: <line x1={7} y1={1} x2={7} y2={13} stroke={VARIANT_CATEGORY_COLORS.deletion} strokeDasharray="3 1.5" strokeWidth={2} />,
  sv: <path d="M 7 2 L 3 7 L 7 12 L 11 7 Z" fill={VARIANT_CATEGORY_COLORS.sv} opacity={0.8} />,
  tr: <><rect x={2} y={3} width={10} height={8} fill={VARIANT_CATEGORY_COLORS.tr} opacity={0.85} rx={1.5} /><line x1={5.5} y1={3} x2={5.5} y2={11} stroke="white" strokeWidth={0.6} opacity={0.5} /><line x1={8.5} y1={3} x2={8.5} y2={11} stroke="white" strokeWidth={0.6} opacity={0.5} /></>,
}

const CATEGORY_LABELS: Record<VariantCategory, string> = {
  snv: 'SNV', insertion: 'INS', deletion: 'DEL', sv: 'SV', tr: 'TR',
}

const CATEGORY_ORDER: VariantCategory[] = ['snv', 'insertion', 'deletion', 'sv', 'tr']

const LegendStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
  border-left: 1px solid #e0e0e0;
  padding-left: 12px;
`

export const Legend = ({
  onMinAfChange = () => { },
  onColorModeChange = () => { },
  colorMode = 'sv_type',
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
  groupingMode = 'similarity' as 'similarity' | 'exact' | 'diploid',
  onGroupingModeChange = (() => { }) as (mode: 'similarity' | 'exact' | 'diploid') => void,
  clusterThreshold = 0,
  onClusterThresholdChange = () => { },
  clusterCount = 0,
  minAfFloor = 0,
  minAfCeiling = 1,
  distanceMetric = 'auto' as import('./haplotypeCompute').DistanceMetric,
  onDistanceMetricChange = (() => { }) as (metric: import('./haplotypeCompute').DistanceMetric) => void,
  regionSize = 0,
  showPhantomRegions = true,
  onShowPhantomRegionsChange = () => { },
  showPopBackground = true,
  onShowPopBackgroundChange = () => { },
  showRecombination = false,
  onShowRecombinationChange = () => { },
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
  groupingMode?: 'similarity' | 'exact' | 'diploid'
  onGroupingModeChange?: (mode: 'similarity' | 'exact' | 'diploid') => void
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
  clusterCount?: number
  minAfFloor?: number
  minAfCeiling?: number
  distanceMetric?: import('./haplotypeCompute').DistanceMetric
  onDistanceMetricChange?: (metric: import('./haplotypeCompute').DistanceMetric) => void
  regionSize?: number
  showPhantomRegions?: boolean
  onShowPhantomRegionsChange?: (show: boolean) => void
  showPopBackground?: boolean
  onShowPopBackgroundChange?: (show: boolean) => void
  showRecombination?: boolean
  onShowRecombinationChange?: (show: boolean) => void
}) => {
  const isDiploidView = groupingMode === 'diploid'
  const isClusteredView = groupingMode === 'similarity'

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

  // Sync sortMode when initialSortBy changes (e.g., toggling diploid view resets sort)
  const prevInitialSortBy = useRef(initialSortBy)
  useEffect(() => {
    if (initialSortBy !== prevInitialSortBy.current) {
      prevInitialSortBy.current = initialSortBy
      setSortMode(initialSortBy)
    }
  }, [initialSortBy])

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

  return (
    <ControlsContainer>
      {/* Top row: Min AF, Grouping, Sort */}
      <ControlGroup>
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
            <MinAfHelp groupingMode={groupingMode} />
          </HaplotypeHelpButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px' }}>Grouping:</label>
          <Select
            value={groupingMode}
            onChange={(e: any) => onGroupingModeChange(e.target.value)}
          >
            <option value="similarity">Similarity Clusters</option>
            <option value="exact">Exact Match</option>
            <option value="diploid">Diploid</option>
          </Select>
          <HaplotypeHelpButton title="Grouping Mode">
            <GroupingModeHelp />
          </HaplotypeHelpButton>
        </div>
        {plotType === 'lollipop' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '12px' }}>Sort:</label>
            <SegmentedControl
              id='sort-mode'
              options={isDiploidView
                ? [
                    { label: 'Frequency', value: 'diplotype_frequency' },
                    { label: 'ROH', value: 'roh_fraction' },
                    { label: 'Comp. Het.', value: 'compound_het' },
                  ]
                : [
                    { label: 'Similarity', value: 'similarity_score' },
                    { label: 'Count', value: 'sample_count' },
                  ]
              }
              value={sortMode}
              onChange={(value: any) => handleSortModeChange(value)}
            />
          </div>
        )}
        <LegendStrip>
          <span style={{ fontWeight: 600, fontSize: 11, color: '#444', alignSelf: 'flex-start', lineHeight: '28px' }}>Legend:</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontWeight: 600, color: '#555' }}>Variants:</span>
              {CATEGORY_ORDER.map((cat) => (
                <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <svg width={14} height={14}>{COMPACT_COLORED_SHAPES[cat]}</svg>
                  {CATEGORY_LABELS[cat]}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontWeight: 600, color: '#555' }}>Populations:</span>
              {Object.entries(SUPERPOPULATION_COLORS).map(([pop, color]) => (
                <span key={pop} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <svg width={8} height={8}><rect width={8} height={8} fill={color} rx={1} /></svg>
                  {pop}
                </span>
              ))}
            </div>
          </div>
        </LegendStrip>
      </ControlGroup>

      {/* Fieldsets: Clustering + Display + Data Layers side by side */}
      <FieldsetRow>
        <Fieldset $disabled={!isClusteredView} style={{ flex: '1.2 1 200px' }}>
          <FieldsetTitle>Clustering</FieldsetTitle>
          <ControlGroup>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>Resolution:</label>
              <input
                type='range'
                min='0'
                max='1'
                step='0.01'
                value={clusterThreshold}
                onChange={(e) => onClusterThresholdChange(parseFloat(e.target.value))}
                style={{ width: '70px' }}
              />
              <span style={{ fontSize: '12px', minWidth: '28px' }}>{clusterThreshold.toFixed(2)}</span>
              {clusterCount > 0 && (
                <span style={{ fontSize: '11px', color: '#666' }}>
                  ({clusterCount} cluster{clusterCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <label>Cluster by:</label>
              <select
                value={distanceMetric}
                onChange={(e) => onDistanceMetricChange(e.target.value as import('./haplotypeCompute').DistanceMetric)}
                style={{ fontSize: '12px', padding: '1px 4px' }}
              >
                <option value="auto">Auto</option>
                <option value="sv_only">SVs/TRs only</option>
                <option value="snv_only">SNVs only</option>
                <option value="all" disabled={regionSize > 500_000}>All variants</option>
              </select>
            </div>
            {!isDiploidView && (
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
            )}
          </ControlGroup>
        </Fieldset>

        <Fieldset style={{ flex: '1 1 200px' }}>
          <FieldsetTitle>Display</FieldsetTitle>
          <ControlGroup>
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
                <HaplotypeHelpButton title="Color Modes">
                  <p>Controls how variant dots and shapes are colored in the track.</p>
                  <dl style={{ margin: 0 }}>
                    <dt style={{ fontWeight: 600, marginTop: 8 }}>Variant Type</dt>
                    <dd style={{ marginLeft: 0, marginBottom: 4 }}>Fixed palette: SNVs (blue), insertions (green), deletions (red), duplications (purple), tandem repeats (orange).</dd>
                    <dt style={{ fontWeight: 600, marginTop: 8 }}>Allele Fingerprint</dt>
                    <dd style={{ marginLeft: 0, marginBottom: 4 }}>Deterministic color per unique allele — identical alleles share the same color.</dd>
                    <dt style={{ fontWeight: 600, marginTop: 8 }}>Position</dt>
                    <dd style={{ marginLeft: 0, marginBottom: 4 }}>Blue→red gradient across the viewed region (5′ to 3′).</dd>
                    <dt style={{ fontWeight: 600, marginTop: 8 }}>Allele Frequency</dt>
                    <dd style={{ marginLeft: 0, marginBottom: 4 }}>Light grey for common, dark for rare.</dd>
                    <dt style={{ fontWeight: 600, marginTop: 8 }}>Haplotype Count</dt>
                    <dd style={{ marginLeft: 0, marginBottom: 4 }}>Grey→red based on how many groups share the variant.</dd>
                  </dl>
                </HaplotypeHelpButton>
              </div>
            )}
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={showPopBackground}
                  onChange={(e) => onShowPopBackgroundChange(e.target.checked)}
                />
                Pop bg
              </label>
            </div>
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <input
                  type='checkbox'
                  checked={showPhantomRegions}
                  onChange={(e) => onShowPhantomRegionsChange(e.target.checked)}
                />
                Expand INS/TRs
              </label>
              <HaplotypeHelpButton title="Expand Insertions & Tandem Repeats">
                <ExpandInsertionsHelp />
              </HaplotypeHelpButton>
            </div>
          </ControlGroup>
        </Fieldset>

        <Fieldset style={{ flex: '0.6 1 150px' }}>
          <FieldsetTitle>Data Layers</FieldsetTitle>
          <ControlGroup>
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
                  checked={showRecombination}
                  onChange={(e) => onShowRecombinationChange(e.target.checked)}
                />
                Recombination rate
              </label>
            </div>
          </ControlGroup>
        </Fieldset>
      </FieldsetRow>
    </ControlsContainer>
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
  dbsnp_id?: string | null
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

export type DiplotypeGroupRef = {
  is_diplotype: true
  samples: { sample_id: string }[]
  hash: number
  [key: string]: any
}

export type HaplotypeGroups = {
  groups: (HaplotypeGroup | DiplotypeGroupRef)[]
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

  const maxAf = pops.reduce((max, p) => Math.max(max, p.value), 0.01)
  const minAf = pops.reduce((min, p) => Math.min(min, p.value), Infinity)
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
  onLoadAllSamples?: () => void
  methylationLoading?: boolean
  methylationSampleCount?: number
  methylationTotalSamples?: number
  haplotypeLoading?: boolean
  workerComputing?: boolean
  loadingStatus?: string
  showMqtl?: boolean
  mqtlLoading?: boolean
  mqtlData?: any[]
  mqtlMinLogP?: number
  plotType?: string
  showGenealogy?: boolean
  hoveredVariantPosition?: number | null
  onVisibleGroupChange?: (group: HaplotypeGroup) => void
  groupingMode?: 'similarity' | 'exact' | 'diploid'
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  treeJson?: string
  minAfFloor?: number
  minAfCeiling?: number
  distanceMetric?: import('./haplotypeCompute').DistanceMetric
  regionSize?: number
  showPhantomRegions?: boolean
  onVariantClick?: (pos: number) => void
  onClusterSelect?: (clusterId: string) => void
  selectedClusterId?: string | null
  highlightedVariantIds?: Set<string> | null
  selectedVariantPos?: number | null
  showMethylation?: boolean
  filterToOutliers?: boolean
  showPopBackground?: boolean
  isAutoTuned?: boolean
  typeFilters?: Record<string, boolean>
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

const BubbleHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The variation graph shows how haplotypes flow through a
      sequence of variant sites. Think of the reference genome as a road: at each variant,
      the road forks — some haplotypes stay on the reference backbone (grey), others take
      an alternate path (colored arc above). After each variant, paths merge back. Each
      fork-and-merge is a <strong>bubble</strong>.
    </p>

    <h4>Nodes &amp; Edges</h4>
    <ul>
      <li><strong>Nodes</strong> (vertical bars and shapes) — Variant positions. Each node
        is a fork point where haplotypes diverge into ref and alt paths. The shape and color
        encode the variant type.</li>
      <li><strong>Edges</strong> (ribbons between nodes) — Groups of haplotypes traveling
        together from one variant to the next. Ribbon <strong>thickness</strong> is
        proportional to the number of haplotypes. Ribbons are colored by the alt variant
        they are associated with.</li>
      <li><strong>Grey backbone</strong> — The reference path. Thickness shows how many
        haplotypes carry the reference allele at each site.</li>
    </ul>

    <h4>Variant Shapes</h4>
    <ul>
      <li><strong style={{ color: '#4A90D9' }}>Blue ellipse</strong> — SNV (single nucleotide variant).</li>
      <li><strong style={{ color: '#D73027' }}>Red dashed arc</strong> — Deletion. Arc spans the deleted region; label shows size.</li>
      <li><strong style={{ color: '#43A047' }}>Green teardrop</strong> — Insertion. Height proportional to inserted sequence length.</li>
      <li><strong style={{ color: '#9467BD' }}>Purple diamond</strong> — Duplication.</li>
      <li><strong style={{ color: '#E8A838' }}>Orange wave</strong> — Tandem repeat variant (TR). Number of oscillations reflects allelic diversity; label shows the length range across carriers.</li>
    </ul>

    <h4>Reading the Flow</h4>
    <ul>
      <li><strong>Thick alt arc</strong> — Common variant (many carriers).</li>
      <li><strong>Thin alt arc</strong> — Rare variant (few carriers).</li>
      <li><strong>Parallel ribbons</strong> — Variants in linkage disequilibrium (same
        haplotypes carry both alt alleles).</li>
      <li><strong>Crossing ribbons</strong> — Recombination between sites: haplotypes
        that carried alt at one variant switch to ref at the next, or vice versa.</li>
      <li><strong>Purple shaded region</strong> — Superbubble: a block of consecutive
        variants in perfect LD, always co-inherited on the same haplotypes.</li>
    </ul>

    <h4>Interaction</h4>
    <p>Hover over a node for variant details (type, position, alleles, AF).
      Hover over a ribbon for transition counts (ref→ref, ref→alt, alt→ref, alt→alt).</p>
  </>
)

const AlluvialHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The alluvial (Sankey) view shows haplotype groups as colored ribbons flowing through variant
      sites across a genomic region. It reveals how haplotypes share or diverge at each variant position.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong>Ribbons</strong> — Each colored ribbon represents a haplotype group. The <strong>thickness</strong> is proportional to the number of samples sharing that haplotype.</li>
      <li><strong style={{ color: '#4a90d9' }}>Blue dots</strong> — Reference allele nodes. Ribbons passing through a blue dot carry the reference allele at that position.</li>
      <li><strong style={{ color: '#d73027' }}>Red dots</strong> — Alternate allele nodes. Ribbons passing through a red dot carry an alternate allele.</li>
      <li><strong>Convergence</strong> — When ribbons merge at the same node, those haplotypes share the same allele at that site.</li>
      <li><strong>Divergence</strong> — When ribbons split to different nodes, haplotypes differ at that site.</li>
    </ul>

    <h4>Left Panel Labels</h4>
    <ul>
      <li><strong>Orange circle + number</strong> — Sample count (how many haplotypes in this group)</li>
      <li><strong>Gray circle + number</strong> — Variant count (how many variant sites this group carries)</li>
      <li><strong>Colored line</strong> — Matches the ribbon color in the plot</li>
    </ul>

    <h4>Interpreting Patterns</h4>
    <ul>
      <li><strong>Wide ribbons</strong> indicate common haplotypes shared by many individuals.</li>
      <li><strong>Thin ribbons</strong> at the bottom are rare, unique haplotypes.</li>
      <li>Regions with many red dots and ribbon splitting indicate <strong>high haplotype diversity</strong>.</li>
      <li>Regions where most ribbons pass through the same node indicate <strong>low diversity</strong> (conserved).</li>
    </ul>

    <h4>Limitations</h4>
    <ul>
      <li>Only the top 30 groups by sample count are shown to avoid visual clutter.</li>
      <li>X-coordinates use genomic position (proportional spacing), so dense variant clusters may appear cramped.</li>
      <li>The AF threshold slider filters which variants define groups — raising it simplifies the view.</li>
    </ul>
  </>
)

const HeatmapHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The binned heatmap (ODGI-style) shows each haplotype group as a horizontal row.
      The genomic region is divided into bins, and each bin is colored by the number of
      alternate alleles that haplotype carries in that bin.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong style={{ color: '#dde4ea' }}>Light blue-gray</strong> — Reference. No alternate alleles in this bin.</li>
      <li><strong style={{ color: 'rgb(218,138,137)' }}>Light coral</strong> — 1 alternate allele in this bin.</li>
      <li><strong style={{ color: 'rgb(216,93,88)' }}>Dark coral</strong> — 2 alternate alleles in this bin.</li>
      <li><strong style={{ color: '#d73027' }}>Red</strong> — 3 or more alternate alleles in this bin.</li>
    </ul>

    <h4>Left Panel Labels</h4>
    <ul>
      <li><strong>Orange circle + number</strong> — Sample count (how many haplotypes share this group)</li>
      <li><strong>Gray circle + number</strong> — Variant count (total variant sites in this group)</li>
      <li>Hover any label to see full details: genomic coordinates, size, and sample IDs.</li>
    </ul>

    <h4>Interpreting Patterns</h4>
    <ul>
      <li><strong>Vertical red stripes</strong> indicate variant hotspots where many haplotype groups carry alternate alleles.</li>
      <li><strong>Horizontal red rows</strong> indicate haplotype groups with many variants across the region.</li>
      <li><strong>White/light columns</strong> indicate conserved regions with few variants.</li>
      <li>Rows are sorted by sample count (most common haplotypes at top).</li>
    </ul>

    <h4>Limitations</h4>
    <ul>
      <li>Only the top 80 groups by sample count are shown.</li>
      <li>The region is divided into 100 bins, so individual variants may be merged within a bin.</li>
      <li>The AF threshold slider filters which variants define groups.</li>
    </ul>
  </>
)

const PaintingHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The chromosome painting divides the region into 100 equal-width genomic bins per haplotype row.
      For each bin, the dominant structural variant (SV/TR) is identified — the one with the highest
      allele frequency. Each bin is colored by that variant's unique hash color, so bins sharing
      the same SV get the same color.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong>Colored blocks</strong> — Between structural variants, bins are forward-filled with the
        color of the preceding SV, creating contiguous colored blocks that represent the structural
        haplotype backbone.</li>
      <li><strong>Color transitions</strong> — Mark structural breakpoints where one SV's influence
        ends and another begins.</li>
      <li><strong>Grey bins</strong> — No SV was found in that region.</li>
    </ul>

    <h4>Interpreting Patterns</h4>
    <ul>
      <li><strong>Matching color patterns</strong> across rows indicate structurally similar haplotypes —
        they share the same SV architecture.</li>
      <li><strong>Different color patterns</strong> indicate distinct structural haplotype backgrounds.</li>
      <li>Think of it as a visual fingerprint of each haplotype's structural variation landscape —
        similar to classical chromosome painting in cytogenetics, but at the sequence level using
        long-read SV calls.</li>
    </ul>

    <h4>Clustered View</h4>
    <p>
      In clustered view, consensus variants (present in ≥50% of cluster samples) determine the painting,
      with opacity proportional to their frequency in the cluster. This highlights the dominant structural
      architecture shared by cluster members.
    </p>
  </>
)

const MinAfHelp = ({ groupingMode = 'similarity' }: { groupingMode?: 'similarity' | 'exact' | 'diploid' }) => (
  <>
    {groupingMode === 'similarity' ? (
      <>
        <p>
          In <strong>Similarity Clusters</strong> mode, the tree and clusters are computed once at the
          lowest AF and remain stable. Moving this slider only shows/hides variant dots on each
          row — it does not rebuild groups or the tree.
        </p>
        <p>
          Rare variants remain visible as small open circles so you can still spot them
          without them affecting the grouping.
        </p>
      </>
    ) : (
      <>
        <p>
          In <strong>{groupingMode === 'diploid' ? 'Diploid' : 'Exact Match'}</strong> mode,
          this slider controls which variants are used when matching haplotypes. Variants below
          this frequency are ignored, directly causing groups to merge. Raising the threshold
          consolidates samples into fewer, larger groups defined by common variants.
        </p>
        <p>
          Rare variants aren't hidden completely — they remain visible as small open circles
          on each group's track so you can still spot them without them breaking up the group.
        </p>
      </>
    )}
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
      Displays a UPGMA hierarchical clustering tree showing the relationships between
      haplotype groups. Rows automatically reorder to match the tree topology, placing
      closely related groups next to each other.
    </p>
    <p>
      <strong>Distance metric:</strong> Use the <em>Cluster by</em> dropdown to control which
      variants are used for computing distances between haplotypes:
      <ul style={{ margin: '4px 0', paddingLeft: '1.2em' }}>
        <li><strong>Auto</strong> — SVs/TRs when 5+ are present (they mutate slowly, providing stable ancestral signal); falls back to all variants for smaller regions.</li>
        <li><strong>SVs/TRs only</strong> — Structural variants and tandem repeats only. Best for large regions where SNV density overwhelms the signal.</li>
        <li><strong>SNVs only</strong> — Single nucleotide variants only. Useful for fine-grained haplotype structure in coding regions where SNVs carry functional signal.</li>
        <li><strong>All variants</strong> — Every variant type. Most sensitive but slower for large regions (&gt;500kb disabled).</li>
      </ul>
    </p>
    <p>
      If the clustered view is also active, a vertical threshold line appears on the tree
      that you can drag to adjust cluster resolution.
    </p>
  </>
)

const GroupingModeHelp = () => (
  <>
    <dl style={{ margin: 0 }}>
      <dt style={{ fontWeight: 600, marginTop: 4 }}>Similarity Clusters (UPGMA)</dt>
      <dd style={{ marginLeft: 0, marginBottom: 8 }}>
        Groups haplotypes by overall structural similarity using UPGMA (Unweighted Pair Group
        Method with Arithmetic Mean), a bottom-up hierarchical clustering algorithm. It starts
        with each haplotype as its own cluster, then iteratively merges the two most similar
        clusters until a single tree is formed. The resolution slider controls where this tree
        is cut &mdash; lower values produce fewer, larger clusters; higher values produce more,
        finer-grained clusters. The Min AF slider only controls which variant dots are displayed
        &mdash; the tree and clusters remain stable. This is the recommended mode for exploring
        population-level haplotype structure.
      </dd>
      <dt style={{ fontWeight: 600, marginTop: 4 }}>Exact Match</dt>
      <dd style={{ marginLeft: 0, marginBottom: 8 }}>
        Strict identity-by-descent matching: haplotypes must share the exact same set of
        variants above the Min AF threshold. The Min AF slider directly changes group
        membership — raising it merges groups.
      </dd>
      <dt style={{ fontWeight: 600, marginTop: 4 }}>Diploid</dt>
      <dd style={{ marginLeft: 0, marginBottom: 8 }}>
        Pairs both strands of each sample together, showing complete diploid structure.
        Highlights runs of homozygosity (ROH) and compound heterozygosity. The Min AF slider
        controls grouping, same as Exact Match mode.
      </dd>
    </dl>
  </>
)

const AutoTunedHelp = () => (
  <>
    <p>
      Default values are automatically calculated from your data to show a useful
      level of detail. Both the minimum allele frequency and cluster resolution are
      derived together, targeting 15–40 visible rows.
    </p>
    <p>
      <strong>Min AF</strong> is set to produce a manageable number of distinct
      haplotype groups. It won't be raised beyond 20% of the AF range to avoid
      over-filtering.
    </p>
    <p>
      <strong>Cluster resolution</strong> is seeded from region size:
      &lt;5kb → 0.20, 5–50kb → 0.25, 50kb–1Mb → 0.35–0.65, &gt;1Mb → 0.70.
      The threshold is then fine-tuned jointly with Min AF.
    </p>
    <p>
      Both values can be adjusted freely. Once you manually change either slider,
      this indicator disappears.
    </p>
  </>
)

const ExpandInsertionsHelp = () => (
  <>
    <p>
      Insertions and tandem repeat expansions add sequence that isn't in the reference
      genome. When this toggle is ON, the view allocates visual space for these inserted
      bases, stretching the coordinate axis to show where new sequence exists.
    </p>
    <p>
      An "accordion" coordinate mapper identifies insertion sites and creates gaps in the
      genomic axis proportional to the inserted sequence length. All tracks stretch together
      so variant positions stay vertically aligned. The position axis shows genomic
      coordinates with gaps marking the phantom (inserted) regions.
    </p>
    <p>
      You'll see the track expand horizontally at insertion sites. Variants that were
      compressed together at a single position now spread out across the phantom region,
      revealing their actual inserted sequence structure. TR variants show their full
      expansion length.
    </p>
    <p>
      <strong>When to use it:</strong> ON (default) — best for examining insertion/TR
      structure and seeing how sequence is organized. OFF — best for overview navigation
      and comparing positions across the reference genome without expansion gaps.
    </p>
    <p>
      Per-locus and global caps keep the view from being dominated by very large insertions.
      Each insertion is capped at 15% of the region width, and total phantom space is capped
      at 50%.
    </p>
  </>
)

// --- Info bar component ---

const InfoBarWrapper = styled.div`
  padding: 5px 12px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  color: #333;
`

const HaplotypeInfoBar = ({
  displayGroups,
  start,
  stop,
  threshold,
  groupingMode = 'similarity',
  clusterCount,
  clusterThreshold,
  haplotypeLoading,
  workerComputing,
  loadingStatus = '',
  methylationLoading,
  methylationSampleCount,
  methylationTotalSamples,
  isAutoTuned,
  plotType,
  distanceMetric = 'auto' as import('./haplotypeCompute').DistanceMetric,
  variationGraph,
  pangenomeGraph,
}: {
  displayGroups: HaplotypeGroup[]
  start: number
  stop: number
  threshold: number
  groupingMode?: 'similarity' | 'exact' | 'diploid'
  clusterCount: number
  clusterThreshold: number
  haplotypeLoading: boolean
  workerComputing: boolean
  loadingStatus: string
  methylationLoading: boolean
  methylationSampleCount: number
  methylationTotalSamples: number
  isAutoTuned: boolean
  plotType: string
  distanceMetric?: import('./haplotypeCompute').DistanceMetric
  variationGraph?: any
  pangenomeGraph?: any
}) => {
  const { totalSamples, totalVariants } = React.useMemo(() => {
    let samples = 0
    const loci = new Set<string>()
    for (const group of displayGroups) {
      samples += group.samples.length
      if ('is_diplotype' in group && (group as any).is_diplotype) {
        const dg = group as any
        for (const v of (dg.haplotypeA?.variants || [])) loci.add(v.variant_id)
        for (const v of (dg.haplotypeB?.variants || [])) loci.add(v.variant_id)
      } else {
        for (const v of group.variants.variants) loci.add(v.variant_id)
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

  // Determine distance metric mode from selection and variant data
  const distanceMode = useMemo(() => {
    if (distanceMetric === 'all') return 'All variants'
    if (distanceMetric === 'snv_only') return 'SNVs only'
    if (distanceMetric === 'sv_only') return 'SVs/TRs only'
    // auto mode: check if enough SVs using region-size-scaled threshold
    const minLen = regionSize > 1_000_000 ? 500 : regionSize > 100_000 ? Math.round(50 + ((regionSize - 100_000) / 900_000) * 450) : 50
    const svIds = new Set<string>()
    for (const group of displayGroups) {
      if ('is_diplotype' in group) continue
      for (const v of (group as any).variants?.variants || []) {
        if (Math.abs(v.allele_length) >= minLen) svIds.add(v.variant_id)
      }
    }
    if (svIds.size < 5) return 'All variants (auto)'
    return `SVs/TRs ≥${minLen}bp (auto)`
  }, [displayGroups, distanceMetric, regionSize])

  const isLoading = haplotypeLoading || workerComputing || methylationLoading

  return (
    <InfoBarWrapper>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span><strong>{totalSamples.toLocaleString()}</strong> {groupingMode === 'diploid' ? 'samples (diploid)' : 'haplotypes'}</span>
        <span style={{ color: '#999' }}>·</span>
        <span><strong>{totalVariants.toLocaleString()}</strong> variants</span>
        <span style={{ color: '#999' }}>·</span>
        <span>{regionLabel}</span>
        <span style={{ color: '#999' }}>·</span>
        <span>{groupingMode === 'diploid' ? 'Diploid' : groupingMode === 'similarity' ? `Similarity Clusters (${clusterCount}) · Resolution: ${clusterThreshold.toFixed(2)}` : 'Exact Match'}</span>
        {groupingMode !== 'diploid' && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span style={{ color: '#888', fontSize: '11px' }}>Distance: {distanceMode}</span>
          </>
        )}
        <span style={{ color: '#999' }}>·</span>
        <span>Min AF: {thresholdLabel}</span>
        <span style={{ color: '#999' }}>·</span>
        <span style={{ textTransform: 'capitalize' }}>{plotType}</span>
        {plotType === 'bubble' && variationGraph && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span style={{ fontSize: '11px' }}>
              {variationGraph.bubbles.length} bubbles
              {variationGraph.bubbles.filter((b: any) => b.isSuperbubble).length > 0 &&
                `, ${variationGraph.bubbles.filter((b: any) => b.isSuperbubble).length} superbubbles`}
            </span>
          </>
        )}
        {plotType === 'alluvial' && pangenomeGraph && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span style={{ fontSize: '11px' }}>
              {Math.min(30, pangenomeGraph.paths.length)} of {pangenomeGraph.paths.length} groups
              {pangenomeGraph.paths.length > 30 ? ' (truncated)' : ''}
            </span>
          </>
        )}
        {plotType === 'heatmap' && pangenomeGraph && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span style={{ fontSize: '11px' }}>
              {Math.min(80, pangenomeGraph.paths.length)} of {pangenomeGraph.paths.length} groups
              {pangenomeGraph.paths.length > 80 ? ' (truncated)' : ''}
            </span>
          </>
        )}
        {plotType === 'lollipop' && (
          <HaplotypeHelpButton title="Lollipop View — How to Read This View">
            <LollipopHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'bubble' && (
          <HaplotypeHelpButton title="Variation Graph — How to Read This View">
            <BubbleHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'alluvial' && (
          <HaplotypeHelpButton title="Alluvial Flow — How to Read This View">
            <AlluvialHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'heatmap' && (
          <HaplotypeHelpButton title="Binned Heatmap — How to Read This View">
            <HeatmapHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'painting' && (
          <HaplotypeHelpButton title="Chromosome Painting — How to Read This View">
            <PaintingHelp />
          </HaplotypeHelpButton>
        )}
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
        {isLoading && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#4a90d9', fontWeight: 500 }}>
              <span style={{
                display: 'inline-block',
                width: '11px',
                height: '11px',
                border: '2px solid rgba(74, 144, 217, 0.3)',
                borderTopColor: '#4a90d9',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              {(haplotypeLoading || workerComputing) && (loadingStatus || (haplotypeLoading ? 'Loading haplotypes…' : 'Computing clusters…'))}
              {!haplotypeLoading && !workerComputing && methylationLoading && (
                methylationTotalSamples > 0
                  ? `Methylation ${methylationSampleCount}/${methylationTotalSamples}`
                  : 'Loading methylation…'
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </span>
          </>
        )}
      </div>
    </InfoBarWrapper>
  )
}

// --- Sub-track components ---

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
                  if (colorMode === 'sv_type') color = ALLELE_TYPE_COLORS[(variant.allele_type || '').toLowerCase()] || '#888'
                  else if (colorMode === 'allele') color = getColorForVariantByHash(variant.variant_id)
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
  initialColorMode = 'sv_type',
  onLoadAllSamples,
  methylationLoading = false,
  methylationSampleCount = 0,
  methylationTotalSamples = 0,
  haplotypeLoading = false,
  workerComputing = false,
  loadingStatus = '',
  showMqtl = false,
  mqtlLoading = false,
  mqtlData = [],
  mqtlMinLogP = 0,
  plotType = 'lollipop',
  showGenealogy = false,
  hoveredVariantPosition,
  onVisibleGroupChange,
  groupingMode = 'similarity',
  clusterThreshold = 0,
  onClusterThresholdChange,
  expandedClusterIds,
  toggleClusterExpansion,
  treeJson,
  minAfFloor = 0,
  minAfCeiling = 1,
  distanceMetric = 'auto' as import('./haplotypeCompute').DistanceMetric,
  regionSize = 0,
  showPhantomRegions = true,
  onVariantClick,
  onClusterSelect,
  selectedClusterId,
  highlightedVariantIds,
  selectedVariantPos,
  showMethylation = false,
  filterToOutliers = true,
  showPopBackground = true,
  isAutoTuned = true,
  typeFilters,
}, ref) {
  const isClusteredView = groupingMode === 'similarity'
  const isDiploidView = groupingMode === 'diploid'

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
  const filteredGroups = useMemo(() => {
    const outlierSampleIds = filterToOutliers && showMethylation
      ? new Set(methylationData.map(d => d.sample))
      : null
    return outlierSampleIds
      ? haplotypeGroups.filter(g => g.samples.some(s => outlierSampleIds.has(s.sample_id)))
      : haplotypeGroups
  }, [haplotypeGroups, filterToOutliers, showMethylation, methylationData])

  // UPGMA genealogy tree computation — prefer backend tree_json when available
  const genealogyResult = useMemo(() => {
    if (!showGenealogy || isDiploidView || filteredGroups.length < 2) return null

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

  const effectiveRegionSize = regionSize || (stop - start)
  const variantCircleRadius = effectiveRegionSize > 100000 ? 2 : 4

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
    () => (displayGroups || []).reduce((max, group) => {
      if ('is_diplotype' in group) {
        return Math.max(max, (group as any).haplotypeA.variants.length + (group as any).haplotypeB.variants.length)
      }
      return Math.max(max, group.variants.variants.length)
    }, 0),
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

  const maxMeth = methylationData.reduce((max, d) => Math.max(max, d.methylation), 0)
  const methylationYScale = scaleLinear()
    .domain([0, Math.max(1, maxMeth)])
    .range([65, 35])

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
      {plotType === 'lollipop' && (
        <>
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
            colorMode={initialColorMode}
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
            isDiploidView={isDiploidView}
            onVariantClick={onVariantClick}
            onClusterSelect={onClusterSelect}
            selectedClusterId={selectedClusterId}
            highlightedVariantIds={highlightedVariantIds}
            selectedVariantPos={selectedVariantPos}
            showPopBackground={showPopBackground}
            typeFilters={typeFilters}
          />
        </>
      )}

      {plotType === 'alluvial' && pangenomeGraph && (
        <AlluvialTrack graph={pangenomeGraph} colorMode={initialColorMode} sampleMetadata={sampleMetadata} />
      )}

      {plotType === 'heatmap' && pangenomeGraph && (
        <HeatmapTrack graph={pangenomeGraph} />
      )}

      {plotType === 'bubble' && variationGraph && (
        <BubbleTrack graph={variationGraph} colorMode={initialColorMode} sampleMetadata={sampleMetadata} />
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

      <HaplotypeInfoBar
        displayGroups={displayGroups}
        start={start}
        stop={stop}
        threshold={initialMinAf}
        groupingMode={groupingMode}
        clusterCount={clusters?.length || 0}
        clusterThreshold={clusterThreshold}
        haplotypeLoading={haplotypeLoading}
        workerComputing={workerComputing}
        loadingStatus={loadingStatus}
        methylationLoading={methylationLoading}
        methylationSampleCount={methylationSampleCount}
        methylationTotalSamples={methylationTotalSamples}
        isAutoTuned={isAutoTuned}
        plotType={plotType}
        distanceMetric={distanceMetric}
        variationGraph={variationGraph}
        pangenomeGraph={pangenomeGraph}
      />
    </Wrapper>
  )
})

export default HaplotypeTrack
