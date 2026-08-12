import React, { useState, useCallback, useMemo, forwardRef, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor, SegmentedControl } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'
import { buildPangenomeGraph } from './pangenome-graph'
import { buildVariationGraph } from './variation-graph'
import AlluvialTrack from './AlluvialTrack'
import HeatmapTrack from './HeatmapTrack'
import BubbleTrack from './BubbleTrack'
import HaplotypeHelpButton from './HelpButton'
import MethylationHelp, { PerCopyMethylationHelp, type MethylationSampleAvailability } from './MethylationHelp'
import MethylationSummaryTrack from './MethylationSummaryTrack'
import { filterGroupsToRegionalDeviationSamples } from './methylationOutlierFilter'
import {
  observationsByCanonicalCopy,
  summarizeMethylationLayerSites,
} from './methylationGroupAggregation'
import { buildMethylationVisualGroups } from './methylationVisualGroups'
import type { MethylationSummaryPoint, MethylationViewMode } from './methylationTypes'
import {
  perCopyMethylationForReadyRow,
  type JoinedPhasedMethylationCapability,
  JoinedPhasedMethylationRecord,
  PerCopyLoadingProgress,
  PerCopyMethylationSampleState,
} from '../LongReadVariantPage/perCopyMethylation'
import { SUPERPOPULATION_COLORS } from './colors'
import { ALLELE_TYPE_COLORS, VARIANT_CATEGORY_COLORS, type VariantCategory } from '../LongReadVariantPage/variantUtils'
import { COLOR_MODES, getVariantCssColor } from '../LongReadVariantPage/variantColorUtils'
import { computeDistanceMatrix, buildUPGMATree } from './genealogy-math'
import DeckGLLollipopTrack, { DeckGLLollipopTrackHandle, HAPLOTYPE_VIEWPORT_HEIGHT } from './DeckGLLollipopTrack'
import ChromosomePainterTrack from './ChromosomePainterTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import { createMinimumAlleleFrequencyScale } from './minimumAlleleFrequency'
import {
  filterHaplotypeGroupsToMatches,
  type VariantMatchPredicate,
} from '../LongReadVariantPage/haplotypeSearchFiltering'
import type { DiplotypeGroup, DiplotypeSample } from './haplotypeCompute'

export type { MethylationSummaryPoint } from './methylationTypes'
export { COLOR_MODES }

export type HaplotypeGroupingMode = 'similarity' | 'exact' | 'diploid'
export type SelectableHaplotypeGroupingMode = Exclude<HaplotypeGroupingMode, 'exact'>

// Exact grouping remains available to the computation layer for compatibility, but it is
// no longer user-selectable. Map legacy or invalid UI state to the closest supported mode.
export const normalizeSelectableGroupingMode = (
  mode: HaplotypeGroupingMode | string | null | undefined
): SelectableHaplotypeGroupingMode => (mode === 'diploid' ? 'diploid' : 'similarity')

const persistedMethylationView = (): MethylationViewMode => {
  try {
    const value = window.sessionStorage.getItem('gnomad-lr-methylation-view')
    return value === 'groups' || value === 'both' ? value : 'sites'
  } catch (_) {
    return 'sites'
  }
}

const Wrapper = styled.div`
  display: flex;
  min-width: 0;
  margin-bottom: 1em;
`

const HaplotypeViewportShell = styled.div<{ $height: number }>`
  position: relative;
  width: 100%;
  overflow: hidden;
  min-width: 0;
  height: ${(props) => props.$height}px;
  background: #fff;
`

const HaplotypeViewportStatus = styled.div<{ $isError?: boolean }>`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 24px;
  background: ${(props) => props.$isError ? 'rgba(255, 248, 248, 0.94)' : 'rgba(255, 255, 255, 0.82)'};
  color: ${(props) => props.$isError ? '#a11' : '#555'};
  text-align: center;
  pointer-events: none;
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

const GroupingControl = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
`

const GroupingRadioGroup = styled.span`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 100%;
`

const FieldsetRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, calc(60% - 4px)) minmax(0, calc(40% - 4px));
  gap: 8px;
  align-items: stretch;

  @media (max-width: 800px) {
    grid-template-columns: minmax(0, 100%);
  }
`

const Fieldset = styled.fieldset<{ $disabled?: boolean }>`
  box-sizing: border-box;
  min-width: 0;
  min-block-size: 100px;
  overflow-wrap: anywhere;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 0;
  background: transparent;
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  pointer-events: ${(p) => (p.$disabled ? 'none' : 'auto')};

  @media (max-width: 800px) {
    min-block-size: 108px;
  }
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
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  font-size: 10px;
  color: #666;
  border-left: 1px solid #e0e0e0;
  padding-left: 12px;

  @media (max-width: 600px) {
    flex-basis: 100%;
    border-left: 0;
    padding-left: 0;
  }
`

const LegendRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
`

const visibleMethylationProgressText = (progress?: PerCopyLoadingProgress | null) => {
  if (progress?.status === 'error') {
    return `Methylation loading error for visible samples (${progress.errorCodes.join(', ')})`
  }
  if (progress?.status === 'loading') {
    return `Loading methylation ${progress.terminalCount}/${progress.totalCount} visible samples…`
  }
  if (progress?.status === 'loaded') return `Loaded ${progress.totalCount} visible samples`
  if (progress?.status === 'empty') return 'No visible methylation samples'
  return null
}

const allMethylationProgressText = (progress?: PerCopyLoadingProgress | null) => {
  if (progress?.status === 'error') {
    return `Methylation loading error (${progress.errorCodes.join(', ')})`
  }
  if (progress?.status === 'loading') {
    return `Loading all methylation ${progress.terminalCount}/${progress.totalCount} samples…`
  }
  if (progress?.status === 'loaded') {
    return `Loaded all ${progress.totalCount} methylation samples`
  }
  if (progress?.status === 'empty') return 'No methylation samples to load'
  return 'Load all methylation samples'
}

export const Legend = ({
  onMinAfChange = () => { },
  onColorModeChange = () => { },
  colorMode = 'sv_type',
  initialMinAf = 0,
  initialSortBy = 'similarity_score',
  onSortModeChange = () => { },
  showMethylation = false,
  onShowMethylationChange = () => { },
  methylationAvailable = false,
  methylationLabel,
  methylationAvailability,
  filterToOutliers = false,
  onFilterToOutliersChange = () => { },
  showPerCopyMethylation = false,
  onShowPerCopyMethylationChange = () => { },
  joinedMethylationCapability,
  joinedMethylationUsableForRegion = false,
  joinedMethylationUnavailableReason,
  methylationSamplesOnly = false,
  onMethylationSamplesOnlyChange = () => { },
  visibleMethylationProgress,
  allMethylationProgress,
  onLoadAllPerCopyMethylation,
  onRetryPerCopyMethylation,
  showMqtl = false,
  onShowMqtlChange = () => { },
  mqtlLoading = false,
  mqtlData = [],
  colorModes = COLOR_MODES,
  showGenealogy = false,
  onShowGenealogyChange = () => { },
  groupingMode = 'similarity' as HaplotypeGroupingMode,
  onGroupingModeChange = (() => { }) as (mode: SelectableHaplotypeGroupingMode) => void,
  clusterThreshold = 0,
  onClusterThresholdChange = () => { },
  clusterCount = 0,
  minAfFloor = 0,
  minAfCeiling = 1,
  distanceMetric = 'auto' as import('./haplotypeCompute').DistanceMetric,
  onDistanceMetricChange = (() => { }) as (metric: import('./haplotypeCompute').DistanceMetric) => void,
  regionSize = 0,
  showPhantomRegions = false,
  onShowPhantomRegionsChange = () => { },
  showRecombination = false,
  onShowRecombinationChange = () => { },
  recombinationAvailable = true,
  recombinationLabel = 'External reference (UCSC hg38)',
}: {
  onMinAfChange?: (threshold: number) => void
  onColorModeChange?: (mode: string) => void
  colorMode?: string
  initialMinAf?: number
  initialSortBy?: string
  onSortModeChange?: (mode: string) => void
  showMethylation?: boolean
  onShowMethylationChange?: (show: boolean) => void
  methylationAvailable?: boolean
  methylationLabel?: string
  methylationAvailability?: MethylationSampleAvailability[] | null
  showPerCopyMethylation?: boolean
  onShowPerCopyMethylationChange?: (show: boolean) => void
  joinedMethylationCapability?: JoinedPhasedMethylationCapability | null
  joinedMethylationUsableForRegion?: boolean
  joinedMethylationUnavailableReason?: string | null
  methylationSamplesOnly?: boolean
  onMethylationSamplesOnlyChange?: (filter: boolean) => void
  visibleMethylationProgress?: PerCopyLoadingProgress | null
  allMethylationProgress?: PerCopyLoadingProgress | null
  onLoadAllPerCopyMethylation?: () => void
  onRetryPerCopyMethylation?: () => void
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
  colorModes?: { value: string; label: string }[]
  showGenealogy?: boolean
  onShowGenealogyChange?: (show: boolean) => void
  groupingMode?: HaplotypeGroupingMode
  onGroupingModeChange?: (mode: SelectableHaplotypeGroupingMode) => void
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
  showRecombination?: boolean
  onShowRecombinationChange?: (show: boolean) => void
  recombinationAvailable?: boolean
  recombinationLabel?: string
}) => {
  const selectableGroupingMode = normalizeSelectableGroupingMode(groupingMode)
  const isDiploidView = selectableGroupingMode === 'diploid'
  const isClusteredView = selectableGroupingMode === 'similarity'
  const perCopyMethylationReason = joinedMethylationUnavailableReason
    ?? joinedMethylationCapability?.reason
    ?? 'Per-copy methylation capability is loading'
  const visibleMethylationProgressLabel = visibleMethylationProgressText(visibleMethylationProgress)
  const allMethylationProgressLabel = allMethylationProgressText(allMethylationProgress)
  const methylationRetryAvailable =
    visibleMethylationProgress?.status === 'error' || allMethylationProgress?.status === 'error'

  // Keep the threshold state and compatibility callback synchronized even though the
  // presentation control is intentionally absent.
  const { afToSlider, sliderToAf } = useMemo(
    () => createMinimumAlleleFrequencyScale(minAfFloor, minAfCeiling),
    [minAfFloor, minAfCeiling]
  )
  const [_sliderValue, setSliderValue] = useState(() => afToSlider(initialMinAf))
  const _threshold = sliderToAf(_sliderValue)
  const [sortMode, setSortMode] = useState(initialSortBy)

  const prevInitialMinAf = useRef(initialMinAf)
  useEffect(() => {
    if (initialMinAf !== prevInitialMinAf.current) {
      prevInitialMinAf.current = initialMinAf
      setSliderValue(afToSlider(initialMinAf))
    }
  }, [afToSlider, initialMinAf])

  // Retain the commit path for compatibility without mounting a user-facing slider.
  const _handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseFloat(event.target.value))
  }
  const _handleThresholdCommit = () => {
    onMinAfChange(sliderToAf(_sliderValue))
  }

  // Sync sortMode when initialSortBy changes (e.g., toggling diploid view resets sort)
  const prevInitialSortBy = useRef(initialSortBy)
  useEffect(() => {
    if (initialSortBy !== prevInitialSortBy.current) {
      prevInitialSortBy.current = initialSortBy
      setSortMode(initialSortBy)
    }
  }, [initialSortBy])

  const handleSortModeChange = (value: string) => {
    setSortMode(value)
    onSortModeChange(value)
  }

  return (
    <ControlsContainer>
      {/* Grouping stays primary; mode-specific controls occupy one stable area below. */}
      <ControlGroup>
        <GroupingControl>
          <GroupingRadioGroup role="radiogroup" aria-label="Grouping">
            <span>Grouping:</span>
            <SegmentedControl
              id="grouping-mode"
              options={[
                { label: 'Diploid', value: 'diploid' },
                { label: 'Similarity Clusters', value: 'similarity' },
              ]}
              value={selectableGroupingMode}
              onChange={(value: any) => onGroupingModeChange(normalizeSelectableGroupingMode(value))}
            />
          </GroupingRadioGroup>
          <HaplotypeHelpButton title="Grouping Mode">
            <GroupingModeHelp />
          </HaplotypeHelpButton>
        </GroupingControl>
        <LegendStrip>
          <span style={{ fontWeight: 600, fontSize: 11, color: '#444', alignSelf: 'flex-start', lineHeight: '28px' }}>Legend:</span>
          <LegendRows>
            <LegendRow>
              <span style={{ fontWeight: 600, color: '#555' }}>Variants:</span>
              {CATEGORY_ORDER.map((cat) => (
                <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <svg width={14} height={14}>{COMPACT_COLORED_SHAPES[cat]}</svg>
                  {CATEGORY_LABELS[cat]}
                </span>
              ))}
            </LegendRow>
            <LegendRow>
              <span style={{ fontWeight: 600, color: '#555' }}>Populations:</span>
              {Object.entries(SUPERPOPULATION_COLORS).map(([pop, color]) => (
                <span key={pop} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <svg width={8} height={8}><rect width={8} height={8} fill={color} rx={1} /></svg>
                  {pop}
                </span>
              ))}
            </LegendRow>
          </LegendRows>
        </LegendStrip>
      </ControlGroup>

      {/* Mode-specific controls and generally available data layers share a responsive row. */}
      <FieldsetRow data-testid="lr-haplotype-mode-subcontrols">
        <Fieldset aria-label="Grouping subcontrols">
          <FieldsetTitle>{isClusteredView ? 'Clustering' : 'Diploid sorting'}</FieldsetTitle>
          <ControlGroup>
            {isClusteredView ? (
              <>
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
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '12px' }}>Sort:</label>
                <SegmentedControl
                  id='sort-mode'
                  options={[
                    { label: 'Sample', value: 'sample_id' },
                    { label: 'ROH', value: 'roh_fraction' },
                  ]}
                  value={sortMode}
                  onChange={(value: any) => handleSortModeChange(value)}
                />
              </div>
            )}
          </ControlGroup>
        </Fieldset>

        <Fieldset>
          <FieldsetTitle>Data Layers</FieldsetTitle>
          <ControlGroup>
            {methylationAvailable && (
              <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                  <input
                    type='checkbox'
                    checked={showMethylation}
                    onChange={(event) => onShowMethylationChange(event.target.checked)}
                  />
                  Methylation context
                </label>
                <HaplotypeHelpButton title="Methylation context">
                  <MethylationHelp availability={methylationAvailability} sourceLabel={methylationLabel} />
                </HaplotypeHelpButton>
                {showMethylation && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input
                      type='checkbox'
                      checked={filterToOutliers}
                      onChange={(event) => onFilterToOutliersChange(event.target.checked)}
                    />
                    Filter haplotypes to API-ranked regional deviations
                  </label>
                )}
              </div>
            )}
            {isDiploidView && (
              <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
              <label
                title={perCopyMethylationReason}
                style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  cursor: joinedMethylationUsableForRegion ? 'pointer' : 'not-allowed',
                }}
              >
                <input
                  type='checkbox'
                  checked={showPerCopyMethylation && joinedMethylationUsableForRegion}
                  disabled={!joinedMethylationUsableForRegion}
                  onChange={(event) => onShowPerCopyMethylationChange(event.target.checked)}
                />
                Per-copy methylation
              </label>
              <HaplotypeHelpButton title="Per-copy methylation">
                <PerCopyMethylationHelp
                  capability={joinedMethylationCapability}
                  unavailableReason={joinedMethylationUsableForRegion ? null : perCopyMethylationReason}
                />
              </HaplotypeHelpButton>
              {!joinedMethylationUsableForRegion && perCopyMethylationReason && (
                <span role='status' style={{ color: '#8a4b08', fontSize: '11px' }}>
                  {perCopyMethylationReason}
                </span>
              )}
              {joinedMethylationUsableForRegion && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                    <input
                      type='checkbox'
                      checked={methylationSamplesOnly}
                      onChange={(event) => onMethylationSamplesOnlyChange(event.target.checked)}
                    />
                    Methylation samples only
                  </label>
                  {showPerCopyMethylation && visibleMethylationProgressLabel && (
                    <button
                      type='button'
                      disabled
                      aria-live='polite'
                      style={{
                        padding: '2px 6px', fontSize: '11px',
                        background: visibleMethylationProgress?.status === 'error' ? '#fff1f0' : '#f0f0f0',
                        border: '1px solid #ccc', borderRadius: '3px',
                      }}
                    >
                      {visibleMethylationProgressLabel}
                    </button>
                  )}
                  {showPerCopyMethylation && onLoadAllPerCopyMethylation && (
                    <button
                      type='button'
                      onClick={onLoadAllPerCopyMethylation}
                      disabled={allMethylationProgress !== null && allMethylationProgress !== undefined}
                      aria-live='polite'
                      style={{
                        padding: '2px 6px', fontSize: '11px',
                        cursor: allMethylationProgress ? 'default' : 'pointer',
                        background: allMethylationProgress?.status === 'error' ? '#fff1f0' : '#f0f0f0',
                        border: '1px solid #ccc', borderRadius: '3px',
                      }}
                    >
                      {allMethylationProgressLabel}
                    </button>
                  )}
                  {showPerCopyMethylation && methylationRetryAvailable && onRetryPerCopyMethylation && (
                    <button
                      type='button'
                      onClick={onRetryPerCopyMethylation}
                      style={{
                        padding: '2px 6px', fontSize: '11px', cursor: 'pointer',
                        background: '#fff1f0', border: '1px solid #c62828', borderRadius: '3px',
                      }}
                    >
                      Retry methylation
                    </button>
                  )}
                </>
              )}
              </div>
            )}
            <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: recombinationAvailable ? 'pointer' : 'not-allowed' }}>
                <input
                  type='checkbox'
                  checked={showRecombination && recombinationAvailable}
                  disabled={!recombinationAvailable}
                  onChange={(e) => onShowRecombinationChange(e.target.checked)}
                />
                Recombination rate
              </label>
              <HaplotypeHelpButton title="Recombination rate">
                <RecombinationHelp
                  sourceLabel={recombinationAvailable ? recombinationLabel : 'Unavailable for this cohort/release'}
                />
              </HaplotypeHelpButton>
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
  short_read_match_id?: string | null
  in_samples?: string[]
  in_haplotypes?: HaplotypeCarrierIdentity[]
  gt_phased?: boolean
}

export type HaplotypeCarrierIdentity = {
  sample_id: string
  vcf_strand: number
  phase_set: string | null
}

type VariantSet = {
  variants: LRVariant[]
  readable_id: string
}

export type Sample = HaplotypeCarrierIdentity & {
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
  samples: Array<{
    sample_id: string
    strand_mapping: { strandA: number | null; strandB: number | null }
    phase_set_mapping: { phaseSetA: string | null; phaseSetB: string | null }
  }>
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
  data_layer?: 'SAMPLE_TOTAL' | 'SOURCE_PHASED'
  // Terra source BED identity. Never infer this from vcf_strand.
  source_haplotype?: 'HAP1' | 'HAP2' | null
  // Populated only after an approved source-orientation mapping.
  vcf_strand?: number | null
  phase_set?: string | null
  ancillary_run_id?: string | null
  source_version?: string | null
  source_manifest_hash?: string | null
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
  viewportStatus?: {
    kind: 'busy' | 'error' | 'empty'
    message: string
  } | null
  start: number
  stop: number
  haplotypeGroups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  methylationData: Methylation[]
  methylationSummary?: MethylationSummaryPoint[]
  methylationOutlierSampleIds?: readonly string[]
  showPerCopyMethylation?: boolean
  perCopyMethylationRecords?: JoinedPhasedMethylationRecord[]
  perCopyMethylationSampleStates?: ReadonlyMap<string, PerCopyMethylationSampleState>
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
  showGenealogy?: boolean
  hoveredVariantPosition?: number | null
  onVisibleGroupChange?: (group: HaplotypeGroup) => void
  onVisibleDiploidSampleIdsChange?: (sampleIds: string[]) => void
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
  isAutoTuned?: boolean
  typeFilters?: Record<string, boolean>
  variantMatchesSearch?: VariantMatchPredicate
  showOnlyMatchingHaplotypes?: boolean
  ambiguousUnphasedRows?: number
}

export type HaplotypeTrackHandle = DeckGLLollipopTrackHandle

// CSS color functions now live in variantColorUtils.ts — use getVariantCssColor()

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
      <li><strong>Methylation context</strong> — When enabled, population, loaded sample-total, and valid Copy A/B layers can show individual CpG sites, temporary visual CpG groups, or both using shared boundaries. Read depth and represented CpGs describe display support.</li>
      <li><strong>mQTLs</strong> — When computed, arc connections show variant-CpG associations. Arc height encodes statistical significance (-log₁₀ p). Red arcs = positive effect, blue = negative.</li>
    </ul>

    <h4>Controls</h4>
    <ul>
      <li><strong>Sort by</strong> — "Similarity" groups similar haplotypes together; "Count" sorts by sample count.</li>
      <li><strong>Filter haplotypes to API-ranked regional deviations</strong> — An opt-in filter using the immutable sample identities returned by the regional API. It is not recomputed from loaded detail rows, depth-aware, diagnostic, or evidence that an unlisted sample is normal.</li>
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
      <li>The underlying AF threshold filters which variants define groups.</li>
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
      <li>The underlying AF threshold filters which variants define groups.</li>
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

export const MinAfHelp = ({ groupingMode = 'similarity' }: { groupingMode?: 'similarity' | 'exact' | 'diploid' }) => {
  if (groupingMode === 'similarity') {
    return (
      <>
        <p>
          In <strong>Similarity Clusters</strong> mode, the tree and clusters are computed once at the
          lowest AF and remain stable. The underlying threshold only shows/hides variant dots on
          each row — it does not rebuild groups or the tree.
        </p>
        <p>
          Rare variants remain visible as small open circles so you can still spot them
          without them affecting the grouping.
        </p>
      </>
    )
  }

  if (groupingMode === 'diploid') {
    return (
      <>
        <p>
          Each Diploid row is an unordered pair of exact chromosome-copy haplotype signatures
          within this region. Two samples share a row when both copies contain the same sets of
          variants at or above Min AF; the two copies may be swapped.
        </p>
        <p>
          For example, <code>{'{v1, v2} + {v3}'}</code> and <code>{'{v3} + {v1, v2}'}</code>
          belong to the same diplotype group.
        </p>
        <p>
          A difference below Min AF does not separate samples; it remains visible as a small open
          background marker. A difference at or above Min AF creates a separate group. Unphased
          variants are excluded from this matching.
        </p>
      </>
    )
  }

  return (
    <>
      <p>
        In <strong>Exact Match</strong> mode, the underlying threshold controls which variants are
        used when matching haplotypes. Variants below this frequency are ignored, directly causing groups
        to merge. Raising the threshold consolidates samples into fewer, larger groups defined by
        common variants.
      </p>
      <p>
        Rare variants aren't hidden completely — they remain visible as small open circles on
        each group's track so you can still spot them without them breaking up the group.
      </p>
    </>
  )
}

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
      <strong>Ancestry pies:</strong> Each compact tree node shows the superpopulation
      composition of the samples represented below it, using the standard gnomAD population
      colors. Leaf pies count samples in that haplotype group; internal pies combine descendant
      sample counts (so larger groups have proportionally more weight). Gray indicates unknown
      or unavailable metadata. Hover a node for counts and percentages.
    </p>
    <p>
      If the clustered view is also active, a vertical threshold line appears on the tree
      that you can drag to adjust cluster resolution.
    </p>
  </>
)

export const GroupingModeHelp = () => (
  <>
    <dl style={{ margin: 0 }}>
      <dt style={{ fontWeight: 600, marginTop: 4 }}>Similarity Clusters (UPGMA)</dt>
      <dd style={{ marginLeft: 0, marginBottom: 8 }}>
        Groups haplotypes by overall structural similarity using UPGMA (Unweighted Pair Group
        Method with Arithmetic Mean), a bottom-up hierarchical clustering algorithm. It starts
        with each haplotype as its own cluster, then iteratively merges the two most similar
        clusters until a single tree is formed. The resolution slider controls where this tree
        is cut &mdash; lower values produce fewer, larger clusters; higher values produce more,
        finer-grained clusters. The underlying AF threshold controls which variant dots are displayed
        &mdash; the tree and clusters remain stable. This is the recommended mode for exploring
        population-level haplotype structure.
      </dd>
      <dt style={{ fontWeight: 600, marginTop: 4 }}>Diploid</dt>
      <dd style={{ marginLeft: 0, marginBottom: 8 }}>
        <p style={{ margin: '0 0 8px' }}>
          Pairs both phased chromosome copies from each sample. Each row is an unordered pair of
          exact haplotype signatures within this region: two samples share a row when both copies
          contain the same sets of variants at or above Min AF, even when the copy order is swapped.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          For example, <code>{'{v1, v2} + {v3}'}</code> and <code>{'{v3} + {v1, v2}'}</code>
          belong to the same diplotype group.
        </p>
        <p style={{ margin: 0 }}>
          A difference below Min AF remains a small open background marker and does not split the
          group. A difference at or above Min AF creates a separate group. Unphased variants are
          excluded from matching. This view also highlights runs of homozygosity (ROH) and
          compound heterozygosity.
        </p>
      </dd>
    </dl>
  </>
)

export const HaplotypeOmissionHelp = () => (
  <p>
    <strong>Unphased</strong> counts per-sample variant carrier records omitted only from
    Haplotype View because an unphased ALT cannot be assigned to haplotype 1 or 2. The
    variants and their frequencies remain available in Summary View.
  </p>
)

export const RecombinationHelp = ({ sourceLabel }: { sourceLabel: string }) => (
  <>
    <p>
      Overlays the local recombination rate, providing context for where haplotype blocks
      may be more likely to break across the displayed region.
    </p>
    <p><strong>Source:</strong> {sourceLabel}</p>
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
      The allele-frequency threshold remains automatically managed. Adjusting cluster resolution
      changes only the visible cluster cut.
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
  box-sizing: border-box;
  min-block-size: 30px;
  padding: 5px 12px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 12px;
  color: #333;

  @media (max-width: 600px) {
    min-block-size: 96px;
  }
`

export const HaplotypeInfoBar = ({
  displayGroups,
  start,
  stop,
  threshold: _threshold,
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
  ambiguousUnphasedRows = 0,
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
  ambiguousUnphasedRows?: number
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
    <InfoBarWrapper data-testid="lr-haplotype-info-slot">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span><strong>{totalSamples.toLocaleString()}</strong> {groupingMode === 'diploid' ? 'samples (diploid)' : 'haplotypes'}</span>
        <span style={{ color: '#999' }}>·</span>
        <span><strong>{totalVariants.toLocaleString()}</strong> variants</span>
        {ambiguousUnphasedRows > 0 && (
          <>
            <span style={{ color: '#999' }}>·</span>
            <span>Unphased: <strong>{ambiguousUnphasedRows.toLocaleString()}</strong></span>
          </>
        )}
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
            <HaplotypeOmissionHelp />
            <LollipopHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'bubble' && (
          <HaplotypeHelpButton title="Variation Graph — How to Read This View">
            <HaplotypeOmissionHelp />
            <BubbleHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'alluvial' && (
          <HaplotypeHelpButton title="Alluvial Flow — How to Read This View">
            <HaplotypeOmissionHelp />
            <AlluvialHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'heatmap' && (
          <HaplotypeHelpButton title="Binned Heatmap — How to Read This View">
            <HaplotypeOmissionHelp />
            <HeatmapHelp />
          </HaplotypeHelpButton>
        )}
        {plotType === 'painting' && (
          <HaplotypeHelpButton title="Chromosome Painting — How to Read This View">
            <HaplotypeOmissionHelp />
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
                  const bColor = colorMode === 'allele' ? getVariantCssColor(variant, 'allele', { start, stop }) : 'grey'
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
                  color = getVariantCssColor(variant, colorMode, { start, stop })

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
  height = HAPLOTYPE_VIEWPORT_HEIGHT,
  viewportStatus,
  haplotypeGroups,
  clusters,
  methylationData,
  methylationSummary = [],
  methylationOutlierSampleIds = [],
  showPerCopyMethylation = false,
  perCopyMethylationRecords = [],
  perCopyMethylationSampleStates = new Map(),
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
  showGenealogy = false,
  hoveredVariantPosition,
  onVisibleGroupChange,
  onVisibleDiploidSampleIdsChange,
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
  showPhantomRegions = false,
  onVariantClick,
  onClusterSelect,
  selectedClusterId,
  highlightedVariantIds,
  selectedVariantPos,
  showMethylation = false,
  filterToOutliers = false,
  isAutoTuned = true,
  typeFilters,
  variantMatchesSearch,
  showOnlyMatchingHaplotypes = false,
  ambiguousUnphasedRows = 0,
}, ref) {
  const isClusteredView = groupingMode === 'similarity'
  const isDiploidView = groupingMode === 'diploid'
  const [methylationViewMode, setMethylationViewModeState] = useState<MethylationViewMode>(
    persistedMethylationView
  )
  const methylationVisualGroups = useMemo(
    () => buildMethylationVisualGroups(methylationSummary),
    [methylationSummary]
  )
  const setMethylationViewMode = useCallback((mode: MethylationViewMode) => {
    setMethylationViewModeState(mode)
    try {
      window.sessionStorage.setItem('gnomad-lr-methylation-view', mode)
    } catch (_) {
      // Session persistence is optional.
    }
  }, [])
  // Alternate renderer implementations remain dormant, but callers cannot select them.
  const plotType: string = 'lollipop'

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

  // The optional filter uses only immutable identities from the regional outlier response.
  // Detail-row transport state must never change membership.
  const filteredGroups = useMemo(() => {
    const searchFilteredGroups = showOnlyMatchingHaplotypes && variantMatchesSearch
      ? filterHaplotypeGroupsToMatches(haplotypeGroups, variantMatchesSearch)
      : haplotypeGroups
    return filterGroupsToRegionalDeviationSamples(
      searchFilteredGroups,
      methylationOutlierSampleIds,
      filterToOutliers && showMethylation
    )
  }, [
    haplotypeGroups,
    showOnlyMatchingHaplotypes,
    variantMatchesSearch,
    filterToOutliers,
    showMethylation,
    methylationOutlierSampleIds,
  ])

  const filteredClusters = useMemo(() => {
    if (!showOnlyMatchingHaplotypes || !variantMatchesSearch || !clusters) return clusters
    const groupsByHash = new Map(filteredGroups.map((group) => [String(group.hash), group]))
    return clusters.flatMap((cluster) => {
      const matchingHashes = cluster.member_group_hashes.filter((hash) => groupsByHash.has(String(hash)))
      if (matchingHashes.length === 0) return []
      const sampleCount = matchingHashes.reduce(
        (count, hash) => count + (groupsByHash.get(String(hash))?.samples.length || 0),
        0
      )
      return [{ ...cluster, member_group_hashes: matchingHashes, sample_count: sampleCount }]
    })
  }, [clusters, filteredGroups, showOnlyMatchingHaplotypes, variantMatchesSearch])

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
      if (s.std_methylation != null) {
        map.set(s.pos1, { mean: s.mean_methylation, std: s.std_methylation })
      }
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

  const selectedCopyEvidence = useMemo(() => {
    if (!showPerCopyMethylation || !isDiploidView) {
      return { readiness: 'loading' as const, points: { A: [], B: [] } }
    }
    const samplesById = new Map<string, DiplotypeSample>()
    displayGroups.forEach((group) => {
      if (!('is_diplotype' in group)) return
      ;(group as unknown as DiplotypeGroup).samples.forEach((sample) => {
        samplesById.set(sample.sample_id, sample)
      })
    })
    const samples = [...samplesById.values()]
    const sampleIds = new Set(samplesById.keys())
    const records = perCopyMethylationRecords.filter((record) => sampleIds.has(record.sample))
    const result = perCopyMethylationForReadyRow(
      records,
      samples,
      perCopyMethylationSampleStates
    )
    if (result.readiness !== 'ready') return result
    const observations = observationsByCanonicalCopy(records, samples)
    const points = (copy: 'A' | 'B') =>
      summarizeMethylationLayerSites(observations[copy]).map((site) => ({
        pos1: site.pos1,
        pos2: site.pos2,
        meanMethylation: site.weightedMeanMethylation,
        meanCoverage: site.meanCoverage,
        sampleCount: site.contributingSampleCount,
      }))
    return { readiness: result.readiness, points: { A: points('A'), B: points('B') } }
  }, [
    displayGroups,
    isDiploidView,
    perCopyMethylationRecords,
    perCopyMethylationSampleStates,
    showPerCopyMethylation,
  ])

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

  const resolvedViewportStatus = viewportStatus ?? (
    haplotypeLoading || workerComputing
      ? {
          kind: 'busy' as const,
          message: loadingStatus || (haplotypeLoading ? 'Loading haplotypes…' : 'Computing clusters…'),
        }
      : displayGroups.length === 0
        ? { kind: 'empty' as const, message: 'There is no haplotype data for this region.' }
        : null
  )
  const viewportIsBusy = resolvedViewportStatus?.kind === 'busy'

  return (
    <Wrapper style={{ flexDirection: 'column' }}>
      {plotType === 'lollipop' && (
        <>
          {showMethylation && methylationSummary.length > 0 && (
            <MethylationSummaryTrack
              methylationSummary={methylationSummary}
              viewMode={methylationViewMode}
              onViewModeChange={setMethylationViewMode}
              visualGroups={methylationVisualGroups}
              sampleTotalMethylation={methylationData}
              copyMethylation={selectedCopyEvidence.points}
              copyEvidenceAvailable={
                showPerCopyMethylation && isDiploidView && selectedCopyEvidence.readiness === 'ready'
              }
            />
          )}

          <HaplotypeViewportShell
            $height={height}
            data-testid="lr-haplotype-viewport-shell"
            aria-busy={viewportIsBusy}
          >
          <DeckGLLollipopTrack
            ref={ref}
            viewportHeight={height}
            displayGroups={displayGroups}
            haplotypeGroups={haplotypeGroups}
            clusters={filteredClusters}
            start={start}
            stop={stop}
            colorMode={initialColorMode}
            showMethylation={showMethylation}
            methylationData={methylationData}
            showPerCopyMethylation={showPerCopyMethylation && isDiploidView}
            perCopyMethylationRecords={perCopyMethylationRecords}
            perCopyMethylationSampleStates={perCopyMethylationSampleStates}
            methylationViewMode={methylationViewMode}
            methylationVisualGroups={methylationVisualGroups}
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
            onVisibleDiploidSampleIdsChange={onVisibleDiploidSampleIdsChange}
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
            typeFilters={typeFilters}
            variantMatchesSearch={variantMatchesSearch}
          />
          {resolvedViewportStatus && (
            <HaplotypeViewportStatus
              $isError={resolvedViewportStatus.kind === 'error'}
              data-testid="lr-haplotype-viewport-status"
              role={resolvedViewportStatus.kind === 'error' ? 'alert' : 'status'}
              aria-live={resolvedViewportStatus.kind === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              <span>{resolvedViewportStatus.message}</span>
            </HaplotypeViewportStatus>
          )}
          </HaplotypeViewportShell>
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
        ambiguousUnphasedRows={ambiguousUnphasedRows}
      />
    </Wrapper>
  )
})

export default HaplotypeTrack
