import React, { useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import styled from 'styled-components'
import { getCategoryFromConsequence, getLabelForConsequenceTerm, VEP_CONSEQUENCE_CATEGORIES, VEP_CONSEQUENCE_CATEGORY_LABELS } from '../vepConsequences'
import CategoryFilterControl from '../CategoryFilterControl'
import { PATH_COLORS, SUPERPOPULATION_COLORS, VARIANT_TYPE_COLORS } from './colors'
import { getVariantCategory, VARIANT_CATEGORY_COLORS, VARIANT_CATEGORY_LABELS } from '../LongReadVariantPage/variantUtils'
import HaplotypeHelpButton from './HelpButton'
import type { HaplotypeGroup, LRVariant } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import Link from '../Link'
import { decomposeSequence, refineDecompositions } from './trvizDecomposition'
import type { SequenceToken, DecomposeAlgorithm } from './trvizDecomposition'

type TrDataPoint = { length_diff: number; pop: string; count: number }

type AlleleStructure = {
  sequence: string
  tokens: SequenceToken[]
  algorithm: DecomposeAlgorithm
  totalMotifUnits: number
  interruptionCount: number
  interruptionBases: number
  popCounts: Record<string, number>
  totalCarriers: number
}

type DerivedVariant = LRVariant & {
  group_count: number
  carrier_count: number
  is_tr: boolean
  tr_distribution?: TrDataPoint[]
  min_length_diff?: number
  max_length_diff?: number
  tr_allele_structures?: AlleleStructure[]
  tr_flank_prefix?: string
  tr_flank_suffix?: string
  short_read_match_id?: string | null
  enveloped_ids?: string[] | null
}

type SortKey = keyof DerivedVariant | 'freq.af' | 'freq.ac' | 'freq.an'

type SortConfig = {
  key: SortKey
  direction: 'asc' | 'desc'
}

const getSortValue = (v: DerivedVariant, key: SortKey): any => {
  if (key === 'freq.af') return v.freq.af
  if (key === 'freq.ac') return v.freq.ac
  if (key === 'freq.an') return v.freq.an
  return (v as any)[key]
}

// --- Styled components ---

const TableContainer = styled.div`
  font-size: 13px;
  overflow-x: auto;
`

const ControlBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 6px 0;
`

const SearchInput = styled.input`
  padding: 3px 8px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 3px;
  width: 160px;
`

const ExportButton = styled.button`
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #f0f0f0;
  cursor: pointer;
  &:hover {
    background: #e0e0e0;
  }
`

const CountLabel = styled.span`
  font-size: 12px;
  color: #666;
  margin-left: auto;
`

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e0e0e0;

  th,
  td {
    padding: 4px 8px;
    text-align: left;
    border-bottom: 1px solid #eee;
    white-space: nowrap;
  }

  th {
    background: #f5f5f5;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    &:hover {
      background: #eaeaea;
    }
  }

  tr:hover {
    background: #f0f7ff;
  }

  th.numeric,
  td.numeric {
    text-align: right;
  }
`

const TypeDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  margin-right: 4px;
  vertical-align: middle;
`

const MatchBadge = styled.span<{ $level: 'exact' | 'truvari' | 'none' }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: ${(p) =>
    p.$level === 'exact' ? '#43A047' : p.$level === 'truvari' ? '#FFA000' : '#9E9E9E'};
`

const ExpandToggle = styled.span`
  cursor: pointer;
  user-select: none;
  margin-right: 4px;
  font-size: 10px;
`

const TrExpandedRow = styled.tr`
  &:hover {
    background: #fafafa !important;
  }
`

const PredictorDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  margin-right: 4px;
  vertical-align: middle;
`

const SvCsqBadge = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  background: #e8e8e8;
  color: #333;
  margin-right: 3px;
  white-space: nowrap;
`

const renderPredictor = (value: number | null | undefined, warnThreshold: number, dangerThreshold: number) => {
  if (value == null) return <span style={{ color: '#ccc' }}>—</span>
  const color = value >= dangerThreshold ? '#e2422a' : value >= warnThreshold ? '#f0c94d' : '#28a745'
  return (
    <span>
      <PredictorDot $color={color} />
      {value.toFixed(1)}
    </span>
  )
}

const parseSvConsequence = (csq: string): { type: string; gene: string | null } => {
  const cleaned = csq.replace(/^PREDICTED_/, '')
  const colonIdx = cleaned.indexOf(':')
  if (colonIdx >= 0) {
    return { type: cleaned.slice(0, colonIdx), gene: cleaned.slice(colonIdx + 1) }
  }
  return { type: cleaned, gene: null }
}

// --- Mini TR Distribution Plot ---

const MIN_PLOT_WIDTH = 300
const BAR_MIN_STEP = 12 // minimum pixels per bar to avoid label overlap
const PLOT_HEIGHT = 80
const PLOT_MARGIN = { top: 8, right: 8, bottom: 20, left: 32 }

const POP_ORDER = ['AFR', 'AMR', 'EAS', 'EUR', 'SAS', 'N/A']

const MiniTRPlot = ({ distribution }: { distribution: TrDataPoint[] }) => {
  const [hoveredBar, setHoveredBar] = useState<{ lengthDiff: number; x: number; y: number } | null>(null)

  // Aggregate by length_diff, then by pop
  const byLength = useMemo(() => {
    const map = new Map<number, Record<string, number>>()
    for (const d of distribution) {
      let entry = map.get(d.length_diff)
      if (!entry) {
        entry = {}
        map.set(d.length_diff, entry)
      }
      entry[d.pop] = (entry[d.pop] || 0) + d.count
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lengthDiff, pops]) => ({
        lengthDiff,
        pops,
        total: Object.values(pops).reduce((s, c) => s + c, 0),
      }))
  }, [distribution])

  if (byLength.length === 0) return null

  const plotWidth = Math.max(MIN_PLOT_WIDTH, byLength.length * BAR_MIN_STEP + PLOT_MARGIN.left + PLOT_MARGIN.right)
  const innerWidth = plotWidth - PLOT_MARGIN.left - PLOT_MARGIN.right
  const innerHeight = PLOT_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom

  const maxTotal = Math.max(...byLength.map((d) => d.total), 1)
  const barWidth = Math.max(4, Math.min(20, innerWidth / byLength.length - 2))

  // Show every Nth label to avoid overlap
  const labelStep = Math.max(1, Math.ceil(byLength.length / (innerWidth / 20)))

  const xScale = (i: number) =>
    PLOT_MARGIN.left + (innerWidth / byLength.length) * i + (innerWidth / byLength.length - barWidth) / 2
  const yScale = (val: number) => PLOT_MARGIN.top + innerHeight * (1 - val / maxTotal)

  return (
    <div style={{ display: 'inline-block', overflowX: 'auto', maxWidth: '100%' }}>
      <svg width={plotWidth} height={PLOT_HEIGHT}>
        {/* Y axis */}
        <line
          x1={PLOT_MARGIN.left}
          y1={PLOT_MARGIN.top}
          x2={PLOT_MARGIN.left}
          y2={PLOT_MARGIN.top + innerHeight}
          stroke="#ccc"
        />
        <text
          x={PLOT_MARGIN.left - 4}
          y={PLOT_MARGIN.top + 3}
          fontSize={8}
          textAnchor="end"
          fill="#999"
        >
          {maxTotal}
        </text>
        <text
          x={PLOT_MARGIN.left - 4}
          y={PLOT_MARGIN.top + innerHeight + 3}
          fontSize={8}
          textAnchor="end"
          fill="#999"
        >
          0
        </text>

        {/* Baseline */}
        <line
          x1={PLOT_MARGIN.left}
          y1={PLOT_MARGIN.top + innerHeight}
          x2={plotWidth - PLOT_MARGIN.right}
          y2={PLOT_MARGIN.top + innerHeight}
          stroke="#ccc"
        />

        {/* Stacked bars */}
        {byLength.map((d, i) => {
          const bx = xScale(i)
          let y = PLOT_MARGIN.top + innerHeight

          return (
            <g
              key={d.lengthDiff}
              onMouseEnter={(e) => setHoveredBar({ lengthDiff: d.lengthDiff, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {POP_ORDER.map((pop) => {
                const count = d.pops[pop] || 0
                if (count === 0) return null
                const barH = (count / maxTotal) * innerHeight
                y -= barH
                return (
                  <rect
                    key={pop}
                    x={bx}
                    y={y}
                    width={barWidth}
                    height={barH}
                    fill={SUPERPOPULATION_COLORS[pop] || '#999'}
                  />
                )
              })}
              {/* X tick label — only show every Nth to avoid overlap */}
              {i % labelStep === 0 && (
                <text
                  x={bx + barWidth / 2}
                  y={PLOT_MARGIN.top + innerHeight + 12}
                  fontSize={7}
                  textAnchor="middle"
                  fill="#666"
                >
                  {d.lengthDiff > 0 ? `+${d.lengthDiff}` : d.lengthDiff}
                </text>
              )}
            </g>
          )
        })}

        {/* X axis label */}
        <text
          x={PLOT_MARGIN.left + innerWidth / 2}
          y={PLOT_HEIGHT - 1}
          fontSize={8}
          textAnchor="middle"
          fill="#999"
        >
          Length diff (bp)
        </text>

        {/* Y axis label */}
        <text
          x={4}
          y={PLOT_MARGIN.top + innerHeight / 2}
          fontSize={8}
          textAnchor="middle"
          fill="#999"
          transform={`rotate(-90, 4, ${PLOT_MARGIN.top + innerHeight / 2})`}
        >
          Carriers
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredBar && (() => {
        const d = byLength.find((b) => b.lengthDiff === hoveredBar.lengthDiff)
        if (!d) return null
        return (
          <div
            style={{
              position: 'fixed',
              left: hoveredBar.x + 12,
              top: hoveredBar.y - 10,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 11,
              zIndex: 1000,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Length diff: {d.lengthDiff > 0 ? `+${d.lengthDiff}` : d.lengthDiff}bp
            </div>
            {POP_ORDER.filter((p) => (d.pops[p] || 0) > 0).map((pop) => (
              <div key={pop} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: SUPERPOPULATION_COLORS[pop] || '#999',
                  }}
                />
                {pop}: {d.pops[pop]}
              </div>
            ))}
            <div style={{ marginTop: 2, color: '#666' }}>Total: {d.total}</div>
          </div>
        )
      })()}
    </div>
  )
}

// --- Mini pop AF bar ---

const PopAfBar = ({ variant }: { variant: DerivedVariant }) => {
  const pops = (variant.populations || []).map((p) => ({
    key: p.id.toUpperCase() === 'NFE' ? 'EUR' : p.id.toUpperCase(),
    value: p.af,
  }))

  if (pops.length === 0) return <span style={{ color: '#ccc' }}>—</span>

  const total = pops.reduce((s, p) => s + p.value, 0)
  if (total === 0) return <span style={{ color: '#ccc' }}>—</span>

  return (
    <svg width={60} height={12} style={{ verticalAlign: 'middle' }}>
      {(() => {
        let x = 0
        return pops.map((p) => {
          const w = (p.value / total) * 60
          const segment = (
            <rect
              key={p.key}
              x={x}
              y={0}
              width={Math.max(w, 0.5)}
              height={12}
              fill={SUPERPOPULATION_COLORS[p.key] || '#999'}
            />
          )
          x += w
          return segment
        })
      })()}
    </svg>
  )
}

// --- Helper ---

const isTrVariant = (v: { allele_type?: string }): boolean =>
  v.allele_type === 'trv'

const getMatchLevel = (matchType: string | null): 'exact' | 'truvari' | 'none' => {
  if (!matchType) return 'none'
  const upper = matchType.toUpperCase()
  if (upper === 'EXACT') return 'exact'
  if (upper.startsWith('TRUVARI')) return 'truvari'
  return 'none'
}

const truncateAllele = (allele: string, max = 8) =>
  allele.length > max ? allele.slice(0, max) + '…' : allele

const formatBp = (bp: number): string => {
  if (bp >= 1000) return `${(bp / 1000).toFixed(1)}kb`
  return `${bp}bp`
}

/** Build a display-friendly variant ID.
 *  - Short variants (ref/alt both ≤20bp): chrom-pos-ref-alt (standard gnomAD format)
 *  - True SVs (symbolic alleles like <DEL>, or either allele >20bp): chrom-pos-SVTYPE(length)
 *
 *  info_SVTYPE is NOT used as the trigger because the LR VCF sets it even for
 *  simple 1bp indels (e.g. info_SVTYPE="DEL" for a 7bp→1bp deletion). */
const buildVariantId = (v: {
  chrom: string
  pos: number
  ref: string
  alt: string
  allele_type?: string
  allele_length?: number
}): string => {
  const isSymbolic = v.alt.startsWith('<') && v.alt.endsWith('>')
  const isLongAllele = v.ref.length > 20 || v.alt.length > 20

  if (isSymbolic || isLongAllele) {
    const svtype = v.allele_type || 'SV'
    const len = v.allele_length ? Math.abs(v.allele_length) : Math.abs(v.alt.length - v.ref.length)
    return `${v.chrom}-${v.pos}-${svtype.toUpperCase()}(${len})`
  }

  return `${v.chrom}-${v.pos}-${v.ref}-${v.alt}`
}

// --- Allele Structure Help ---

const AlleleStructureHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The motif structure grid shows how each distinct tandem repeat allele is composed
      at the sequence level. Each row is a unique allele structure observed in the cohort.
    </p>

    <h4>Reading the Grid</h4>
    <ul>
      <li><strong>Colored blocks</strong> represent repeat motif units (e.g., each "T" in a poly-T repeat). Colors correspond to different motifs at multi-motif loci.</li>
      <li><strong>Dark blocks</strong> are interruptions — bases that don't match any expected motif. Interruption positions can be clinically significant (e.g., AGG interruptions in FMR1 CGG repeats stabilize the tract).</li>
      <li><strong>Block width</strong> is proportional to the nucleotide length of each unit.</li>
      <li><strong>Units</strong> — total number of motif repeat units in the allele.</li>
      <li><strong>Interruptions</strong> — count of interruption segments and their total base length.</li>
      <li><strong>Haplotypes</strong> — number of haplotypes carrying this exact allele structure, with population-colored bar. Percentages are relative to total haplotypes (each diploid sample contributes two).</li>
    </ul>

    <h4>Purity Heatmap (Large Expansions)</h4>
    <p>
      For alleles longer than 2kb or with more than 100 repeat units, individual blocks
      become too small to render. Instead, the sequence is divided into 100bp bins and each
      bin is colored by its local motif purity:
    </p>
    <ul>
      <li><strong>Green</strong> — 100% of bases match a motif (pure repeat)</li>
      <li><strong>Yellow</strong> — ~50% motif purity (mixed)</li>
      <li><strong>Red</strong> — 0% motif purity (completely diverged)</li>
    </ul>
    <p>
      This reveals whether purity degrades toward one end (common in unstable expansions)
      or is uniformly distributed.
    </p>

    <h4>Hover</h4>
    <ul>
      <li>Hover over any row to see the raw allele sequence.</li>
      <li>In the purity heatmap, hover over a bin to see its bp range and local purity percentage.</li>
    </ul>
  </>
)

// --- Allele Structure Grid (FMR1-style visualization) ---

const MOTIF_COLORS = PATH_COLORS.slice(0, 8)
const INTERRUPTION_COLOR = '#333'
const STRUCTURE_ROW_HEIGHT = 16
const STRUCTURE_BLOCK_MIN_WIDTH = 4
const STRUCTURE_MAX_GRID_WIDTH = 500
const STRUCTURE_DEFAULT_ROWS = 10

const AlleleStructureGrid = ({
  structures,
  motifs,
  flankPrefix,
  flankSuffix,
}: {
  structures: AlleleStructure[]
  motifs: string[]
  flankPrefix?: string
  flankSuffix?: string
}) => {
  const [showAll, setShowAll] = useState(false)
  const [expandAllSeqs, setExpandAllSeqs] = useState(false)

  const displayed = showAll ? structures : structures.slice(0, STRUCTURE_DEFAULT_ROWS)
  const hiddenCount = structures.length - STRUCTURE_DEFAULT_ROWS

  // Compute the scale: find the longest sequence to normalize block widths
  const maxSeqLen = Math.max(...structures.map((s) => s.sequence.length), 1)
  const scale = STRUCTURE_MAX_GRID_WIDTH / maxSeqLen

  // Total haplotypes across all structures (denominator for percentages)
  const totalHaplotypes = structures.reduce((s, a) => s + a.totalCarriers, 0)

  // Max carrier count for bar scaling
  const maxCarriers = Math.max(...structures.map((s) => s.totalCarriers), 1)

  return (
    <div style={{ marginTop: 8 }}>
      {/* Motif legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6, fontSize: 11 }}>
        {motifs.map((motif, i) => (
          <span key={motif} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: MOTIF_COLORS[i % MOTIF_COLORS.length],
              }}
            />
            <span style={{ fontFamily: 'monospace' }}>{motif}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: INTERRUPTION_COLOR,
              opacity: 0.6,
            }}
          />
          interruption
        </span>
        <HaplotypeHelpButton title="Motif Structure — How to Read This View">
          <AlleleStructureHelp />
        </HaplotypeHelpButton>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          color: '#888',
          fontWeight: 600,
          marginBottom: 2,
          paddingLeft: 2,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span style={{ width: STRUCTURE_MAX_GRID_WIDTH, flexShrink: 0 }}>Motif Structure</span>
        <span style={{ width: 40, textAlign: 'right' }}>Units</span>
        <span style={{ width: 80, textAlign: 'right' }}>Interruptions</span>
        <span style={{ width: 120 }}>Haplotypes</span>
        <button
          onClick={() => setExpandAllSeqs(!expandAllSeqs)}
          style={{
            fontSize: 8,
            fontFamily: 'monospace',
            fontWeight: 600,
            lineHeight: 1,
            padding: '1px 4px',
            borderRadius: 2,
            cursor: 'pointer',
            color: expandAllSeqs ? '#1565c0' : '#999',
            background: expandAllSeqs ? '#e3f2fd' : '#fafafa',
            border: `1px solid ${expandAllSeqs ? '#90caf9' : '#e0e0e0'}`,
          }}
        >
          {expandAllSeqs ? '▾ All Seq' : '▸ All Seq'}
        </button>
      </div>

      {/* Rows */}
      {displayed.map((allele, idx) => (
        <AlleleStructureRow
          key={idx}
          allele={allele}
          scale={scale}
          maxCarriers={maxCarriers}
          totalHaplotypes={totalHaplotypes}
          flankPrefix={flankPrefix}
          flankSuffix={flankSuffix}
          motifs={motifs}
          forceExpandSeq={expandAllSeqs}
        />
      ))}

      {/* Show more / less */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: 4,
            padding: '2px 8px',
            fontSize: 11,
            border: '1px solid #ccc',
            borderRadius: 3,
            background: '#f8f8f8',
            cursor: 'pointer',
          }}
        >
          {showAll ? 'Show fewer' : `Show ${hiddenCount} more rare alleles`}
        </button>
      )}
    </div>
  )
}

const SeqToggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick() }}
    title={active ? 'Hide sequence' : 'Show sequence'}
    style={{
      fontSize: 8,
      fontFamily: 'monospace',
      fontWeight: 600,
      lineHeight: 1,
      padding: '1px 3px',
      borderRadius: 2,
      cursor: 'pointer',
      color: active ? '#1565c0' : '#999',
      background: active ? '#e3f2fd' : '#fafafa',
      border: `1px solid ${active ? '#90caf9' : '#e0e0e0'}`,
      flexShrink: 0,
    }}
  >
    {active ? '▾ Seq' : '▸ Seq'}
  </button>
)

const AlgorithmBadge = ({ algorithm }: { algorithm: DecomposeAlgorithm }) => (
  <span
    title={algorithm === 'dp' ? 'Decomposed with trviz DP alignment' : 'Decomposed with greedy regex'}
    style={{
      fontSize: 8,
      fontFamily: 'monospace',
      fontWeight: 600,
      lineHeight: 1,
      padding: '1px 3px',
      borderRadius: 2,
      color: algorithm === 'dp' ? '#6a1b9a' : '#888',
      background: algorithm === 'dp' ? '#f3e5f5' : '#f5f5f5',
      border: `1px solid ${algorithm === 'dp' ? '#ce93d8' : '#e0e0e0'}`,
      flexShrink: 0,
    }}
  >
    {algorithm === 'dp' ? 'DP' : 'RE'}
  </span>
)

/**
 * Per-base coloring: a base gets the motif color if it matches the canonical
 * motif at that position. Otherwise it's "non-matching" — same treatment
 * whether the token was classified as motif-with-mismatch or interruption.
 */
const baseMatchesMotif = (token: SequenceToken, ci: number, motifs: string[]): boolean => {
  if (token.type === 'interruption') return false
  const canonical = motifs[token.motifIndex]
  if (!canonical) return false
  if (ci >= canonical.length) return false
  return token.sequence[ci].toUpperCase() === canonical[ci].toUpperCase()
}

const SequenceFoldout = ({ tokens, motifs }: { tokens: SequenceToken[]; motifs: string[] }) => (
  <div
    style={{
      overflowX: 'auto',
      maxWidth: STRUCTURE_MAX_GRID_WIDTH + 260,
      padding: '4px 0 6px 2px',
      borderTop: '1px solid #eee',
    }}
  >
    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 1 }}>
      {tokens.map((token, ti) => {
        const motifColor =
          token.type === 'motif'
            ? MOTIF_COLORS[token.motifIndex % MOTIF_COLORS.length]
            : null
        const label =
          token.type === 'motif' ? motifs[token.motifIndex] ?? '?' : 'int'
        return (
          <span key={ti} style={{ display: 'inline-flex', flexShrink: 0 }} title={`${label} (${token.sequence.length}bp)`}>
            {token.sequence.split('').map((ch, ci) => {
              const matches = baseMatchesMotif(token, ci, motifs)
              return (
                <span
                  key={ci}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 10,
                    lineHeight: '14px',
                    width: 8,
                    textAlign: 'center',
                    background: matches ? motifColor! : INTERRUPTION_COLOR,
                    color: matches ? '#fff' : '#aaa',
                    opacity: matches ? 1 : 0.7,
                    borderRadius: ci === 0 ? '2px 0 0 2px' : ci === token.sequence.length - 1 ? '0 2px 2px 0' : 0,
                  }}
                >
                  {ch}
                </span>
              )
            })}
          </span>
        )
      })}
    </div>
    <div style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>
      {tokens.reduce((s, t) => s + t.sequence.length, 0)}bp
      {' · '}
      {tokens.length} tokens
      {' · '}
      motifs: {motifs.join(', ')}
    </div>
  </div>
)

const AlleleStructureRow = ({
  allele,
  scale,
  maxCarriers,
  totalHaplotypes,
  flankPrefix,
  flankSuffix,
  motifs,
  forceExpandSeq = false,
}: {
  allele: AlleleStructure
  scale: number
  maxCarriers: number
  totalHaplotypes: number
  flankPrefix?: string
  flankSuffix?: string
  motifs: string[]
  forceExpandSeq?: boolean
}) => {
  const [hovered, setHovered] = useState(false)
  const [showSeq, setShowSeq] = useState(false)
  const seqVisible = showSeq || forceExpandSeq

  const useBinnedView = allele.totalMotifUnits > 100 || allele.sequence.length > 2000

  const gridWidth = allele.sequence.length * scale

  if (useBinnedView) {
    // Bin the sequence into ~100bp chunks and compute local purity per bin
    const BIN_SIZE = 100
    const seqLen = allele.tokens.reduce((s, t) => s + t.sequence.length, 0)
    const numBins = Math.max(1, Math.ceil(seqLen / BIN_SIZE))
    const binWidth = Math.min(6, STRUCTURE_MAX_GRID_WIDTH / numBins)

    // Walk tokens to fill bins with motif/interruption base counts
    const bins: { motifBases: number; totalBases: number; start: number; end: number }[] = []
    for (let b = 0; b < numBins; b++) {
      bins.push({ motifBases: 0, totalBases: 0, start: b * BIN_SIZE, end: Math.min((b + 1) * BIN_SIZE, seqLen) })
    }
    let pos = 0
    for (const token of allele.tokens) {
      const tLen = token.sequence.length
      for (let i = 0; i < tLen; i++) {
        const binIdx = Math.min(Math.floor((pos + i) / BIN_SIZE), numBins - 1)
        bins[binIdx].totalBases++
        if (token.type === 'motif') bins[binIdx].motifBases++
      }
      pos += tLen
    }

    // Compute longest pure motif run (consecutive motif tokens)
    let longestPureRun = 0
    let currentRun = 0
    for (const token of allele.tokens) {
      if (token.type === 'motif') {
        currentRun++
        longestPureRun = Math.max(longestPureRun, currentRun)
      } else {
        currentRun = 0
      }
    }

    const overallPurity = allele.totalMotifUnits / Math.max(allele.totalMotifUnits + allele.interruptionCount, 1)

    // Green-yellow-red diverging scale for purity (distinct from motif colors)
    const interpolatePurity = (purity: number) => {
      // 1.0 = dark green (#2e7d32), 0.5 = yellow (#fdd835), 0.0 = red (#c62828)
      if (purity >= 0.5) {
        const t = (purity - 0.5) * 2 // 0..1
        const r = Math.round(253 * (1 - t) + 46 * t)
        const g = Math.round(216 * (1 - t) + 125 * t)
        const b = Math.round(53 * (1 - t) + 50 * t)
        return `rgb(${r},${g},${b})`
      }
      const t = purity * 2 // 0..1
      const r = Math.round(198 * (1 - t) + 253 * t)
      const g = Math.round(40 * (1 - t) + 216 * t)
      const b = Math.round(40 * (1 - t) + 53 * t)
      return `rgb(${r},${g},${b})`
    }

    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 2,
            paddingTop: 1,
            paddingBottom: 1,
            background: hovered ? '#f0f7ff' : undefined,
            borderRadius: 2,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Binned purity heatmap */}
          <div style={{ width: STRUCTURE_MAX_GRID_WIDTH, flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
            {flankPrefix && (
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#999', marginRight: 2, flexShrink: 0 }}>{flankPrefix}</span>
            )}
            <svg width={numBins * binWidth + 1} height={STRUCTURE_ROW_HEIGHT}>
              {bins.map((bin, i) => {
                const purity = bin.totalBases > 0 ? bin.motifBases / bin.totalBases : 0
                return (
                  <rect
                    key={i}
                    x={i * binWidth}
                    y={2}
                    width={binWidth - 0.5}
                    height={STRUCTURE_ROW_HEIGHT - 4}
                    rx={0}
                    fill={interpolatePurity(purity)}
                  >
                    <title>{`bp ${bin.start}–${bin.end}: ${(purity * 100).toFixed(0)}% purity`}</title>
                  </rect>
                )
              })}
              <rect
                x={0} y={2}
                width={numBins * binWidth}
                height={STRUCTURE_ROW_HEIGHT - 4}
                fill="none" stroke="#ddd" strokeWidth={0.5} rx={1}
              />
            </svg>
            {flankSuffix && (
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#999', marginLeft: 2, flexShrink: 0 }}>{flankSuffix}</span>
            )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#888', marginTop: 1 }}>
              <span>{formatBp(seqLen)} | {(overallPurity * 100).toFixed(0)}% purity | longest pure run: {longestPureRun} | {numBins} bins of {BIN_SIZE}bp</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
                <span style={{ color: '#aaa' }}>purity:</span>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#c62828', borderRadius: 1 }} />
                <span>0%</span>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#fdd835', borderRadius: 1 }} />
                <span>50%</span>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: '#2e7d32', borderRadius: 1 }} />
                <span>100%</span>
              </span>
            </div>
          </div>

          <span style={{ width: 40, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: '#444' }}>
            {allele.totalMotifUnits}
          </span>

          <span style={{ width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: allele.interruptionCount > 0 ? '#c62828' : '#999' }}>
            {allele.interruptionCount > 0 ? `${allele.interruptionCount} (${formatBp(allele.interruptionBases)})` : '—'}
          </span>

          <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width={80} height={10}>
              {(() => {
                let bx = 0
                const barTotal = (allele.totalCarriers / maxCarriers) * 80
                return POP_ORDER.map((pop) => {
                  const count = allele.popCounts[pop] || 0
                  if (count === 0) return null
                  const w = (count / allele.totalCarriers) * barTotal
                  const segment = (
                    <rect key={pop} x={bx} y={0} width={Math.max(w, 0.5)} height={10} fill={SUPERPOPULATION_COLORS[pop] || '#999'} rx={1} />
                  )
                  bx += w
                  return segment
                })
              })()}
            </svg>
            <span style={{ fontSize: 10, color: '#666' }}>
              {allele.totalCarriers}
              <span style={{ color: '#aaa' }}> ({((allele.totalCarriers / totalHaplotypes) * 100).toFixed(0)}%)</span>
            </span>
          </div>
          <AlgorithmBadge algorithm={allele.algorithm} />
          <SeqToggle active={showSeq} onClick={() => setShowSeq(!showSeq)} />
        </div>
        {seqVisible && <SequenceFoldout tokens={allele.tokens} motifs={motifs} />}
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 2,
          paddingTop: 1,
          paddingBottom: 1,
          background: hovered ? '#f0f7ff' : undefined,
          borderRadius: 2,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={allele.sequence.length <= 200
          ? `${allele.sequence} (${allele.sequence.length}bp)`
          : `${allele.sequence.slice(0, 80)}...${allele.sequence.slice(-80)} (${allele.sequence.length}bp)`}
      >
        {/* Motif grid with flanking context */}
        <div style={{ width: STRUCTURE_MAX_GRID_WIDTH, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {flankPrefix && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#999', marginRight: 2, flexShrink: 0 }}>{flankPrefix}</span>
        )}
        <svg
          width={STRUCTURE_MAX_GRID_WIDTH - (flankPrefix ? flankPrefix.length * 6 + 4 : 0) - (flankSuffix ? flankSuffix.length * 6 + 4 : 0)}
          height={STRUCTURE_ROW_HEIGHT}
          style={{ flexShrink: 1, flexGrow: 1 }}
        >
          {(() => {
            let x = 0
            const gap = 0.5
            return allele.tokens.map((token, i) => {
              const w = Math.max(STRUCTURE_BLOCK_MIN_WIDTH, token.sequence.length * scale) - gap
              const block = (
                <rect
                  key={i}
                  x={x}
                  y={2}
                  width={Math.max(w, 1)}
                  height={STRUCTURE_ROW_HEIGHT - 4}
                  rx={1}
                  fill={
                    token.type === 'motif'
                      ? MOTIF_COLORS[token.motifIndex % MOTIF_COLORS.length]
                      : INTERRUPTION_COLOR
                  }
                  opacity={token.type === 'interruption' ? 0.6 : 1}
                  stroke="white"
                  strokeWidth={0.5}
                />
              )
              x += w + gap
              return block
            })
          })()}
          {/* Faint outline around the whole bar */}
          <rect
            x={0}
            y={2}
            width={gridWidth}
            height={STRUCTURE_ROW_HEIGHT - 4}
            fill="none"
            stroke="#ddd"
            strokeWidth={0.5}
            rx={1}
          />
        </svg>
        {flankSuffix && (
          <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#999', marginLeft: 2, flexShrink: 0 }}>{flankSuffix}</span>
        )}
        </div>

        {/* Repeat unit count */}
        <span
          style={{
            width: 40,
            textAlign: 'right',
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#444',
          }}
        >
          {allele.totalMotifUnits}
        </span>

        {/* Interruption summary */}
        <span
          style={{
            width: 80,
            textAlign: 'right',
            fontSize: 11,
            fontFamily: 'monospace',
            color: allele.interruptionCount > 0 ? '#c62828' : '#999',
          }}
        >
          {allele.interruptionCount > 0
            ? `${allele.interruptionCount} (${formatBp(allele.interruptionBases)})`
            : '—'}
        </span>

        {/* Population-stacked carrier bar */}
        <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width={80} height={10}>
            {(() => {
              let bx = 0
              const barTotal = (allele.totalCarriers / maxCarriers) * 80
              return POP_ORDER.map((pop) => {
                const count = allele.popCounts[pop] || 0
                if (count === 0) return null
                const w = (count / allele.totalCarriers) * barTotal
                const segment = (
                  <rect
                    key={pop}
                    x={bx}
                    y={0}
                    width={Math.max(w, 0.5)}
                    height={10}
                    fill={SUPERPOPULATION_COLORS[pop] || '#999'}
                    rx={1}
                  />
                )
                bx += w
                return segment
              })
            })()}
          </svg>
          <span style={{ fontSize: 10, color: '#666' }}>
            {allele.totalCarriers}
            <span style={{ color: '#aaa' }}>
              {' '}({((allele.totalCarriers / totalHaplotypes) * 100).toFixed(0)}%)
            </span>
          </span>
        </div>
        <AlgorithmBadge algorithm={allele.algorithm} />
        <SeqToggle active={showSeq} onClick={() => setShowSeq(!showSeq)} />
      </div>
      {seqVisible && <SequenceFoldout tokens={allele.tokens} motifs={motifs} />}
    </div>
  )
}

// --- Memoized table row ---

type TableRowProps = {
  v: DerivedVariant
  i: number
  isExpanded: boolean
  mode: 'summary' | 'haplotype'
  totalGroups: number
  totalSamples: number
  variantDict: Map<string, any>
  onHoverVariant?: (position: number | null) => void
  toggleExpand: (id: string) => void
}

const TableRow = React.memo(function TableRow({
  v,
  i,
  isExpanded,
  mode,
  totalGroups,
  totalSamples,
  variantDict,
  onHoverVariant,
  toggleExpand,
}: TableRowProps) {
  const COL_COUNT = 12
  return (
    <React.Fragment key={`${v.pos}-${v.variant_id}-${i}`}>
      <tr
        data-position={v.pos}
        onMouseEnter={() => onHoverVariant?.(v.pos)}
        onMouseLeave={() => onHoverVariant?.(null)}
        style={v.is_tr ? { cursor: 'pointer', background: isExpanded ? '#fff8e1' : undefined } : undefined}
        onClick={v.is_tr ? () => toggleExpand(v.variant_id) : undefined}
      >
        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {v.is_tr && (
            <ExpandToggle>{isExpanded ? '▼' : '▶'}</ExpandToggle>
          )}
          {v.variant_id}
        </td>
        <td>
          <TypeDot $color={VARIANT_CATEGORY_COLORS[getVariantCategory(v.allele_type, v.allele_length)]} />
          {v.is_tr ? 'TR' : v.allele_type}
        </td>
        <td className="numeric">
          {v.is_tr
            ? `${v.min_length_diff ?? 0}..${v.max_length_diff ?? 0}bp`
            : v.allele_length}
        </td>
        <td className="numeric">{v.freq.af.toFixed(4)}</td>
        {mode === 'summary' && <td className="numeric">{v.freq.ac}</td>}
        {mode === 'summary' && <td className="numeric">{v.freq.an}</td>}
        {mode === 'haplotype' && (
          <td className="numeric">
            {v.group_count} / {totalGroups}
          </td>
        )}
        {mode === 'haplotype' && (
          <td className="numeric">
            {v.carrier_count} / {totalSamples}
          </td>
        )}
        <td>
          <PopAfBar variant={v} />
        </td>
        {mode === 'summary' && (
          <td>
            {v.short_read_match_id ? (
              <Link
                to={`/variant/${v.short_read_match_id}?dataset=gnomad_r4`}
                preserveSelectedDataset={false}
                title={v.short_read_match_id}
              >
                {v.short_read_match_id.length > 20
                  ? `${v.short_read_match_id.slice(0, 20)}…`
                  : v.short_read_match_id}
              </Link>
            ) : <span style={{ color: '#ccc' }}>—</span>}
          </td>
        )}
        {mode === 'haplotype' && (
          <td>
            <span style={{ color: '#ccc' }}>—</span>
          </td>
        )}
        <td className="numeric">{renderPredictor(v.cadd_phred, 25.3, 28.1)}</td>
        <td className="numeric">{renderPredictor(v.phylop, 7.367, 9.741)}</td>
        <td>
          {v.major_consequence
            ? getLabelForConsequenceTerm(v.major_consequence)
            : <span style={{ color: '#ccc' }}>—</span>}
        </td>
        <td>
          {v.rsid && v.rsid.startsWith('rs') ? (
            <a
              href={`https://www.ncbi.nlm.nih.gov/snp/${v.rsid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#428bca', textDecoration: 'none' }}
            >
              {v.rsid}
            </a>
          ) : v.dbgap_id ? (
            <span style={{ color: '#666', fontFamily: 'monospace', fontSize: 11 }}>{v.dbgap_id}</span>
          ) : (
            <span style={{ color: '#ccc' }}>—</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <TrExpandedRow>
          <td colSpan={COL_COUNT} style={{ padding: '8px 16px', background: '#fffde7' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {v.tr_distribution && <MiniTRPlot distribution={v.tr_distribution} />}
              <div style={{ fontSize: 11, color: '#555' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  TR Locus: {v.chrom}:{v.pos}
                  {v.tr_id && <span style={{ fontWeight: 400, marginLeft: 8, color: '#888' }}>({v.tr_id})</span>}
                </div>
                {v.tr_distribution && (
                  <>
                    <div>Allele length range: {v.min_length_diff ?? 0} to {v.max_length_diff ?? 0}bp</div>
                    <div>Distinct allele lengths: {new Set(v.tr_distribution.map((d) => d.length_diff)).size}</div>
                  </>
                )}
                <div>Total carriers: {v.carrier_count}</div>
                {v.tr_motifs && (
                  <div style={{ marginTop: 4, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>Motifs: </span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      background: '#f0e6d2',
                      padding: '1px 6px',
                      borderRadius: 3,
                      border: '1px solid #e0cdb5',
                      letterSpacing: '0.5px',
                    }}>{v.tr_motifs}</span>
                  </div>
                )}
                {v.gnomad_str && <div>TRGT ID: <span style={{ fontFamily: 'monospace' }}>{v.gnomad_str}</span></div>}
                {v.motif_counts && v.motif_counts.length > 0 && <div>Motif counts: <span style={{ fontFamily: 'monospace' }}>{v.motif_counts.join(', ')}</span></div>}
                {v.allele_purity != null && <div>Allele purity: {v.allele_purity.toFixed(3)}</div>}
                {v.tr_distribution && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {POP_ORDER.filter((p) => v.tr_distribution!.some((d) => d.pop === p)).map((pop) => (
                      <span key={pop} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: SUPERPOPULATION_COLORS[pop] || '#999',
                          }}
                        />
                        {pop}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overlapping variant calls (enveloped variants) */}
                {v.enveloped_ids && v.enveloped_ids.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 4, fontSize: 12 }}>
                      Overlapping variant calls ({v.enveloped_ids.length})
                    </h4>
                    <p style={{ fontSize: 11, color: '#666', marginTop: 0, marginBottom: 8 }}>
                      These variants were independently called within this repeat region
                      and may be artifacts of repeat-length variation.
                    </p>
                    <ul style={{ fontSize: 11, margin: 0, paddingLeft: 16 }}>
                      {v.enveloped_ids.map((id: string) => {
                        const envVar = variantDict.get(id)
                        if (!envVar) {
                          return <li key={id} style={{ marginBottom: 4 }}>{id} (data not loaded)</li>
                        }
                        return (
                          <li key={id} style={{ marginBottom: 4 }}>
                            <Link to={`/variant/${id}`}>{id}</Link>
                            {' '}({envVar.allele_type}, AC={envVar.freq?.all?.ac || 0})
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {/* Allele structure grid (FMR1-style motif visualization) */}
            {mode === 'haplotype' && v.tr_allele_structures && v.tr_allele_structures.length > 0 && v.tr_motifs && (
              <AlleleStructureGrid
                structures={v.tr_allele_structures}
                motifs={v.tr_motifs.split(',').map((m: string) => m.trim())}
                flankPrefix={v.tr_flank_prefix}
                flankSuffix={v.tr_flank_suffix}
              />
            )}
          </td>
        </TrExpandedRow>
      )}
    </React.Fragment>
  )
})

// --- Main component ---

type HaplotypeVariantTableProps = {
  mode?: 'summary' | 'haplotype'
  summaryVariants?: any[]
  haplotypeGroups?: { groups: HaplotypeGroup[] }
  sampleMetadata?: SampleMetadataMap
  totalGroups?: number
  onHoverVariant?: (position: number | null) => void
  onVisibleVariantChange?: (pos: number) => void
  maxHeight?: string
}

export type HaplotypeVariantTableHandle = {
  scrollToPosition: (pos: number) => void
}

// Stable default references — destructuring defaults like `= []` create new objects
// every render, which invalidates useMemo deps and causes the 2-second variants
// derivation to recompute on every scroll tick.
const EMPTY_VARIANTS: any[] = []
const EMPTY_HAPLOTYPE_GROUPS: { groups: HaplotypeGroup[] } = { groups: [] }
const EMPTY_SAMPLE_METADATA = new Map() as SampleMetadataMap

const HaplotypeVariantTable = forwardRef<HaplotypeVariantTableHandle, HaplotypeVariantTableProps>(function HaplotypeVariantTable({
  mode = 'haplotype',
  summaryVariants = EMPTY_VARIANTS,
  haplotypeGroups = EMPTY_HAPLOTYPE_GROUPS,
  sampleMetadata = EMPTY_SAMPLE_METADATA,
  onHoverVariant,
  onVisibleVariantChange,
  maxHeight = '500px',
}, ref) {
  const [sort, setSort] = useState<SortConfig>({ key: 'pos', direction: 'asc' })
  const [searchText, setSearchText] = useState('')
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    snv: true,
    deletion: true,
    insertion: true,
    sv: true,
    tr: true,
  })
  const [consequenceFilters, setConsequenceFilters] = useState<Record<string, boolean>>({
    lof: true,
    missense: true,
    synonymous: true,
    other: true,
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const tableScrollRef = useRef<HTMLDivElement>(null)
  const sortedRef = useRef<DerivedVariant[]>([])

  // Row height for virtualization (approximate — includes padding/borders)
  const ROW_HEIGHT = 28
  const VISIBLE_BUFFER_ROWS = 15

  // Track visible row window — only triggers re-render when rows actually need
  // to change (scroll moves past half the buffer), NOT on every scroll pixel.
  const [visibleWindow, setVisibleWindow] = useState({ startRow: 0, endRow: Math.ceil(500 / ROW_HEIGHT) + 2 * VISIBLE_BUFFER_ROWS })

  const handleTableScroll = useCallback(() => {
    if (!tableScrollRef.current) return
    const container = tableScrollRef.current
    const scrollTop = container.scrollTop
    const maxH = container.clientHeight || 500

    const newStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER_ROWS)
    const visibleCount = Math.ceil(maxH / ROW_HEIGHT) + 2 * VISIBLE_BUFFER_ROWS
    const newEnd = newStart + visibleCount

    // Only re-render when window shifts by half the buffer (~30 rows / ~840px)
    setVisibleWindow(prev => {
      if (Math.abs(prev.startRow - newStart) < VISIBLE_BUFFER_ROWS / 2) return prev
      return { startRow: newStart, endRow: newEnd }
    })

    if (!onVisibleVariantChange || !sortedRef.current) return
    // Use math instead of DOM traversal to find the visible variant position.
    const visibleIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT))
    if (visibleIdx < sortedRef.current.length) {
      onVisibleVariantChange(sortedRef.current[visibleIdx].pos)
    }
  }, [onVisibleVariantChange])

  // Expose scrollToPosition for external sync
  useImperativeHandle(ref, () => ({
    scrollToPosition(pos: number) {
      if (!tableScrollRef.current) return
      const rows = tableScrollRef.current.querySelectorAll('tbody tr[data-position]')
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as HTMLElement
        const rowPos = parseInt(row.getAttribute('data-position')!, 10)
        if (rowPos >= pos) {
          tableScrollRef.current.scrollTop = row.offsetTop - 30
          return
        }
      }
    },
  }), [])

  // O(1) lookup for resolving enveloped variant IDs to full objects
  const variantDict = useMemo(() => {
    return new Map(summaryVariants.map((v: any) => [v.variant_id, v]))
  }, [summaryVariants])

  // Derive unique variant list, grouping TRVs by position
  const variants = useMemo(() => {
    console.time('[perf] HaplotypeVariantTable derive variants')
    if (mode === 'summary') {
      return summaryVariants.map((v: any) => {
        const populations = (v.freq?.populations || []).map((p: any) => ({
          id: p.id,
          af: p.af ?? 0,
        }))
        return {
          variant_id: v.variant_id,
          chrom: v.chrom,
          pos: v.pos,
          end: v.end || null,
          ref: v.ref,
          alt: v.alt,
          allele_type: v.allele_type,
          allele_length: v.length || 0,
          freq: {
            af: v.freq?.all?.af || 0,
            ac: v.freq?.all?.ac || 0,
            an: v.freq?.all?.an || 0,
          },
          populations,
          rsid: (v.rsids || [])[0] || '',
          major_consequence: v.major_consequence || null,
          cadd_phred: v.cadd_phred ?? null,
          phylop: v.phylop ?? null,
          sv_consequences: v.sv_consequences || null,
          dbgap_id: null,
          tr_id: null,
          tr_motifs: v.motifs?.join(',') || null,
          gnomad_str: null,
          allele_methylation: null,
          motif_counts: null,
          allele_purity: null,
          // DerivedVariant extensions
          group_count: 0,
          carrier_count: v.freq?.all?.ac || 0,
          short_read_match_id: v.short_read_match_id || null,
          is_tr: v.allele_type === 'trv',
          enveloped_ids: v.enveloped_ids || null,
        } as DerivedVariant
      })
    }

    // Count unique samples for TR AF calculation
    const allSampleIds = new Set<string>()
    for (const g of haplotypeGroups.groups) {
      for (const s of g.samples) allSampleIds.add(s.sample_id)
    }
    const sampleCount = allSampleIds.size

    // Phase 1: collect all variant occurrences with carrier info
    const map = new Map<
      string,
      {
        variant: any
        groupCount: number
        carrierIds: Set<string>
        // For TR loci: accumulate per-carrier length diffs by pop
        trCarriers?: Map<string, { lengthDiff: number; pop: string }[]>
        // For TR loci: accumulate alt sequences with per-haplotype population counts
        trSequences?: Map<string, Record<string, number>>
      }
    >()

    for (const group of haplotypeGroups.groups) {
      const seen = new Set<string>()
      // Include both above-threshold and below-threshold variants
      const allVariants = [
        ...group.variants.variants,
        ...(group.below_threshold?.variants || []),
      ]
      for (const v of allVariants) {
        const isTrv = isTrVariant(v)
        // TR variants group by chrom:pos:TRV; others by pos:ref:alt
        const key = isTrv
          ? `${v.chrom}:${v.pos}:TRV`
          : `${v.pos}:${v.ref}:${v.alt}`
        if (seen.has(key)) continue
        seen.add(key)

        let entry = map.get(key)
        if (!entry) {
          entry = {
            variant: v,
            groupCount: 0,
            carrierIds: new Set(),
            ...(isTrv ? { trCarriers: new Map(), trSequences: new Map() } : {}),
          }
          map.set(key, entry)
        }
        entry.groupCount++

        for (const s of group.samples) {
          entry.carrierIds.add(s.sample_id)

          // Accumulate TR length diff per carrier
          if (isTrv && entry.trCarriers) {
            const meta = sampleMetadata.get(s.sample_id)
            const pop = meta?.superpopulation || 'N/A'
            const altSeq = v.alt
            const lengthDiff = altSeq.length - v.ref.length
            const carrierId = s.sample_id
            if (!entry.trCarriers.has(carrierId)) {
              entry.trCarriers.set(carrierId, [])
            }
            entry.trCarriers.get(carrierId)!.push({ lengthDiff, pop })

            // Track alt sequences with haplotype counts (one per haplotype, not per sample)
            if (entry.trSequences && altSeq.length <= 10000) {
              let popCounts = entry.trSequences.get(altSeq)
              if (!popCounts) {
                popCounts = {}
                entry.trSequences.set(altSeq, popCounts)
              }
              popCounts[pop] = (popCounts[pop] || 0) + 1
            }
          }
        }
      }
    }

    // Phase 2: build DerivedVariant array
    const result: DerivedVariant[] = []
    for (const [key, { variant: v, groupCount, carrierIds, trCarriers, trSequences }] of map) {
      const isTrv = key.endsWith(':TRV')

      // Build TR distribution from accumulated carrier data
      let trDistribution: TrDataPoint[] | undefined
      let minLengthDiff: number | undefined
      let maxLengthDiff: number | undefined

      if (isTrv && trCarriers && trCarriers.size > 0) {
        const distMap = new Map<string, number>() // "lengthDiff:pop" -> count
        for (const [, entries] of trCarriers) {
          for (const { lengthDiff, pop } of entries) {
            const dkey = `${lengthDiff}:${pop}`
            distMap.set(dkey, (distMap.get(dkey) || 0) + 1)
          }
        }
        trDistribution = []
        const allLengths: number[] = []
        for (const [dkey, count] of distMap) {
          const [ld, pop] = dkey.split(':')
          const lengthDiff = parseInt(ld, 10)
          trDistribution.push({ length_diff: lengthDiff, pop, count })
          allLengths.push(lengthDiff)
        }
        if (allLengths.length > 0) {
          minLengthDiff = Math.min(...allLengths)
          maxLengthDiff = Math.max(...allLengths)
        }
      }

      // Build allele structures for TR loci
      let trAlleleStructures: AlleleStructure[] | undefined
      let flankPrefix = ''
      let flankSuffix = ''
      if (isTrv && trSequences && trSequences.size > 0 && v.tr_motifs) {
        console.time(`[perf] TR decompose pos=${v.pos} (${trSequences.size} alleles)`)
        const motifs = (v.tr_motifs as string).split(',').map((m: string) => m.trim()).filter(Boolean)
        const refSeq = v.ref as string
        // Compute flanking context from ref: decompose ref (minus anchor) and grab leading/trailing non-motif bases
        const refRepeat = refSeq.length > 1 ? refSeq.slice(1) : refSeq
        const refResult = decomposeSequence(refRepeat, motifs)
        if (refResult.tokens.length > 0 && refResult.tokens[0].type === 'interruption') {
          flankPrefix = refResult.tokens[0].sequence.slice(-5) // last 5 chars of leading flank
        }
        if (refResult.tokens.length > 0 && refResult.tokens[refResult.tokens.length - 1].type === 'interruption') {
          flankSuffix = refResult.tokens[refResult.tokens.length - 1].sequence.slice(0, 5) // first 5 chars of trailing flank
        }
        if (motifs.length > 0) {
          // Pass 1: decompose each allele sequence
          const interim: Array<{ seq: string; popCounts: Record<string, number>; tokens: SequenceToken[]; algorithm: DecomposeAlgorithm }> = []
          for (const [seq, popCounts] of trSequences) {
            const repeatSeq = seq.length > 1 && refSeq.length > 0 && seq[0] === refSeq[0] ? seq.slice(1) : seq
            const { tokens, algorithm } = decomposeSequence(repeatSeq, motifs)
            interim.push({ seq, popCounts, tokens, algorithm })
          }

          // Pass 2: refine decompositions to normalize boundary ambiguities
          const allTokenLists = interim.map((item) => item.tokens)
          const refined = refineDecompositions(allTokenLists)

          // Pass 3: build final allele structures from refined tokens
          trAlleleStructures = interim.map((item, i) => {
            const tokens = refined[i]
            const totalMotifUnits = tokens.filter((t) => t.type === 'motif').length
            const interruptions = tokens.filter((t) => t.type === 'interruption')
            return {
              sequence: item.seq,
              tokens,
              algorithm: item.algorithm,
              totalMotifUnits,
              interruptionCount: interruptions.length,
              interruptionBases: interruptions.reduce((s, t) => s + t.sequence.length, 0),
              popCounts: item.popCounts,
              totalCarriers: Object.values(item.popCounts).reduce((s, c) => s + c, 0),
            }
          })
          trAlleleStructures.sort((a, b) => b.totalCarriers - a.totalCarriers)
        }
        console.timeEnd(`[perf] TR decompose pos=${v.pos} (${trSequences.size} alleles)`)
      }

      const variantId = isTrv
        ? `${v.chrom}-${v.pos}-TR`
        : buildVariantId(v)

      const af = isTrv
        ? carrierIds.size / Math.max(1, sampleCount)
        : v.freq.af

      result.push({
        // LRVariant base fields
        variant_id: variantId,
        chrom: v.chrom,
        pos: v.pos,
        end: v.end ?? null,
        ref: v.ref,
        alt: isTrv ? `TR(${minLengthDiff ?? 0}..${maxLengthDiff ?? 0}bp)` : v.alt,
        allele_type: isTrv ? 'trv' : v.allele_type || 'snv',
        allele_length: isTrv
          ? (maxLengthDiff ?? 0) - (minLengthDiff ?? 0)
          : v.allele_length || 0,
        freq: {
          af,
          ac: carrierIds.size,
          an: sampleCount * 2,
        },
        populations: v.populations || [],
        rsid: v.rsid || '',
        major_consequence: v.major_consequence ?? null,
        cadd_phred: v.cadd_phred ?? null,
        phylop: v.phylop ?? null,
        sv_consequences: v.sv_consequences ?? null,
        dbgap_id: v.dbgap_id ?? null,
        tr_id: v.tr_id ?? null,
        tr_motifs: v.tr_motifs ?? null,
        gnomad_str: v.gnomad_str ?? null,
        allele_methylation: v.allele_methylation ?? null,
        motif_counts: v.motif_counts ?? null,
        allele_purity: v.allele_purity ?? null,
        // DerivedVariant extensions
        group_count: groupCount,
        carrier_count: carrierIds.size,
        is_tr: isTrv,
        tr_distribution: trDistribution,
        min_length_diff: minLengthDiff,
        max_length_diff: maxLengthDiff,
        tr_allele_structures: trAlleleStructures,
        tr_flank_prefix: flankPrefix || undefined,
        tr_flank_suffix: flankSuffix || undefined,
        short_read_match_id: null,
        enveloped_ids: null,
      })
    }

    console.log(`[perf] HaplotypeVariantTable: ${result.length} derived variants (${result.filter(v => v.is_tr).length} TR)`)
    console.timeEnd('[perf] HaplotypeVariantTable derive variants')
    return result
  }, [mode, summaryVariants, haplotypeGroups, sampleMetadata])

  const totalGroups = haplotypeGroups.groups.length
  const totalSamples = useMemo(() => {
    const ids = new Set<string>()
    for (const g of haplotypeGroups.groups) {
      for (const s of g.samples) ids.add(s.sample_id)
    }
    return ids.size
  }, [haplotypeGroups])

  // Filter
  const filtered = useMemo(() => {
    let list = variants

    // Type filter
    list = list.filter((v) => typeFilters[getVariantCategory(v.allele_type, v.allele_length)])

    // Consequence category filter
    list = list.filter((v) => {
      const cat = getCategoryFromConsequence(v.major_consequence) || 'other'
      return consequenceFilters[cat]
    })

    // Search filter
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (v) =>
          v.variant_id.toLowerCase().includes(q) ||
          String(v.pos).includes(q) ||
          v.rsid.toLowerCase().includes(q) ||
          v.ref.toLowerCase().includes(q) ||
          v.alt.toLowerCase().includes(q)
      )
    }

    return list
  }, [variants, typeFilters, consequenceFilters, searchText])

  // Sort
  const sorted = useMemo(() => {
    const { key, direction } = sort
    const multiplier = direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = getSortValue(a, key)
      const bv = getSortValue(b, key)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * multiplier
      return ((av as number) - (bv as number)) * multiplier
    })
  }, [filtered, sort])
  sortedRef.current = sorted

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    )
  }

  const sortIndicator = (key: SortKey) => {
    if (sort.key !== key) return ''
    return sort.direction === 'asc' ? ' ▲' : ' ▼'
  }

  const consequenceCategoryColors: Record<string, string> = {
    lof: '#FF583F',
    missense: '#F0C94D',
    synonymous: 'green',
    other: '#757575',
  }

  const variantTypeCategories = (
    ['snv', 'deletion', 'insertion', 'sv', 'tr'] as const
  ).map((cat) => ({
    id: cat,
    label: VARIANT_CATEGORY_LABELS[cat],
    color: VARIANT_CATEGORY_COLORS[cat],
  }))

  const consequenceCategories = VEP_CONSEQUENCE_CATEGORIES.map((category) => ({
    id: category,
    label: (VEP_CONSEQUENCE_CATEGORY_LABELS as Record<string, string>)[category],
    color: consequenceCategoryColors[category],
  }))

  const exportCSV = () => {
    const headers = [
      'variant_id',
      'chrom',
      'position',
      'ref',
      'alt',
      'type',
      'sv_type',
      'length',
      'lr_af',
      'groups',
      'carriers',
      'sr_match',
      'rsid',
      'af_afr',
      'af_amr',
      'af_eas',
      'af_nfe',
      'af_sas',
      'cadd_phred',
      'phylop',
      'sv_consequences',
      'dbgap_id',
    ]
    const escapeField = (s: string) => (s.includes(',') ? `"${s}"` : s)
    const getPopAf = (v: DerivedVariant, popId: string) =>
      v.populations?.find((p) => p.id === popId)?.af ?? ''
    const rows = sorted.map((v) =>
      [
        v.variant_id,
        v.chrom,
        v.pos,
        escapeField(v.ref),
        escapeField(v.alt),
        v.allele_type,
        getVariantCategory(v.allele_type, v.allele_length),
        v.allele_length,
        v.freq.af,
        `${v.group_count}/${totalGroups}`,
        `${v.carrier_count}/${totalSamples}`,
        '',
        v.rsid,
        getPopAf(v, 'afr'),
        getPopAf(v, 'amr'),
        getPopAf(v, 'eas'),
        getPopAf(v, 'nfe'),
        getPopAf(v, 'sas'),
        v.cadd_phred ?? '',
        v.phylop ?? '',
        v.sv_consequences ? escapeField(v.sv_consequences.join(';')) : '',
        v.dbgap_id ?? '',
      ].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'haplotype_variants.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <TableContainer>
      <ControlBar>
        <CategoryFilterControl
          categories={variantTypeCategories}
          categorySelections={typeFilters}
          id="lr-variant-type-filter"
          onChange={setTypeFilters}
        />
        <CategoryFilterControl
          categories={consequenceCategories}
          categorySelections={consequenceFilters}
          id="lr-consequence-filter"
          onChange={setConsequenceFilters}
        />
        <SearchInput
          type="text"
          placeholder="Search position, rsID, allele…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <ExportButton onClick={exportCSV}>Export CSV</ExportButton>
        {sorted.some((v) => v.is_tr) && (
          <>
            <ExportButton
              onClick={() =>
                setExpandedRows(new Set(sorted.filter((v) => v.is_tr).map((v) => v.variant_id)))
              }
            >
              Expand all TR
            </ExportButton>
            <ExportButton onClick={() => setExpandedRows(new Set())}>Fold all TR</ExportButton>
          </>
        )}
        <CountLabel>
          Showing {sorted.length} of {variants.length} variants
        </CountLabel>
      </ControlBar>

      <div ref={tableScrollRef} onScroll={handleTableScroll} style={{ maxHeight, overflowY: 'auto', position: 'relative' }}>
        <StyledTable>
          <thead>
            <tr>
              <th onClick={() => handleSort('variant_id')}>Variant ID{sortIndicator('variant_id')}</th>
              <th onClick={() => handleSort('allele_type')}>Type{sortIndicator('allele_type')}</th>
              <th className="numeric" onClick={() => handleSort('allele_length')}>
                Length{sortIndicator('allele_length')}
              </th>
              <th className="numeric" onClick={() => handleSort('freq.af')}>LR AF{sortIndicator('freq.af')}</th>
              {mode === 'summary' && <th className="numeric" onClick={() => handleSort('freq.ac')}>AC{sortIndicator('freq.ac')}</th>}
              {mode === 'summary' && <th className="numeric" onClick={() => handleSort('freq.an')}>AN{sortIndicator('freq.an')}</th>}
              {mode === 'haplotype' && (
                <th className="numeric" onClick={() => handleSort('group_count')}>
                  Groups{sortIndicator('group_count')}
                </th>
              )}
              {mode === 'haplotype' && (
                <th className="numeric" onClick={() => handleSort('carrier_count')}>
                  Carriers{sortIndicator('carrier_count')}
                </th>
              )}
              <th>Pop AF</th>
              {mode === 'summary' && (
                <th onClick={() => handleSort('short_read_match_id')}>
                  SR Match ID{sortIndicator('short_read_match_id')}
                </th>
              )}
              {mode === 'haplotype' && (
                <th>
                  SR Match
                </th>
              )}
              <th className="numeric" onClick={() => handleSort('cadd_phred')} style={{ width: 60 }}>
                CADD{sortIndicator('cadd_phred')}
              </th>
              <th className="numeric" onClick={() => handleSort('phylop')} style={{ width: 60 }}>
                phyloP{sortIndicator('phylop')}
              </th>
              <th onClick={() => handleSort('major_consequence')}>Consequence{sortIndicator('major_consequence')}</th>
              <th onClick={() => handleSort('rsid')}>rsID{sortIndicator('rsid')}</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Skip virtualization when the row count is small enough to render all
              // (e.g. filtered to TR-only). Virtualization with variable-height expanded
              // rows causes spacer drift since off-screen rows can't be measured.
              const VIRTUALIZE_THRESHOLD = 200
              const shouldVirtualize = sorted.length >= VIRTUALIZE_THRESHOLD && expandedRows.size === 0

              let startRow = 0
              let endRow = sorted.length
              let topPad = 0
              let bottomPad = 0

              if (shouldVirtualize) {
                startRow = visibleWindow.startRow
                const visibleCount = visibleWindow.endRow - visibleWindow.startRow
                endRow = Math.min(sorted.length, startRow + visibleCount)
                topPad = startRow * ROW_HEIGHT
                bottomPad = Math.max(0, (sorted.length - endRow) * ROW_HEIGHT)
              }

              return (
                <>
                  {topPad > 0 && <tr style={{ height: topPad }} />}
                  {sorted.slice(startRow, endRow).map((v, sliceIdx) => {
                    const i = startRow + sliceIdx
                    const isExpanded = v.is_tr && expandedRows.has(v.variant_id)
                    return (
                      <TableRow
                        key={`${v.pos}-${v.variant_id}-${i}`}
                        v={v}
                        i={i}
                        isExpanded={isExpanded}
                        mode={mode}
                        totalGroups={totalGroups}
                        totalSamples={totalSamples}
                        variantDict={variantDict}
                        onHoverVariant={onHoverVariant}
                        toggleExpand={toggleExpand}
                      />
                    )
                  })}
                  {bottomPad > 0 && <tr style={{ height: bottomPad }} />}
                </>
              )
            })()}
          </tbody>
        </StyledTable>
      </div>
    </TableContainer>
  )
})

export default React.memo(HaplotypeVariantTable)
