import React, { useState } from 'react'

import { PATH_COLORS, SUPERPOPULATION_COLORS } from './colors'
import { POP_ORDER } from './TRDistributionPlot'
import type { SequenceToken, DecomposeAlgorithm } from './trvizDecomposition'

export type AlleleStructure = {
  sequence: string
  tokens: SequenceToken[]
  algorithm: DecomposeAlgorithm
  totalMotifUnits: number
  interruptionCount: number
  interruptionBases: number
  popCounts: Record<string, number>
  totalCarriers: number
}

const formatBp = (bp: number): string => {
  if (bp >= 1000) return `${(bp / 1000).toFixed(1)}kb`
  return `${bp}bp`
}

// --- Allele Structure Help ---

export const AlleleStructureHelp = ({
  ambiguousUnphasedRows = 0,
}: {
  ambiguousUnphasedRows?: number
}) => (
  <>
    <h4 style={{ marginTop: 0 }}>Scope</h4>
    <p>
      The motif structure grid shows how each exact tandem repeat ALT copy that can be assigned
      deterministically to a haplotype is composed at the sequence level. Included copies come from
      phased, haploid, or unphased homozygous-ALT calls.
    </p>
    <p>
      This is a partial assigned-copy view, not a full-cohort sequence-structure distribution.
      Percentages use only the exact assigned ALT copies displayed in the grid. The separate
      full-cohort plots summarize repeat counts and do not encode exact ALT sequences.
    </p>
    <p>
      Ambiguous unphased heterozygous carrier rows are excluded because the call does not identify
      whether the ALT copy belongs to haplotype 1 or haplotype 2.
      {ambiguousUnphasedRows > 0 && (
        <>
          {' '}
          Across the loaded region, this excludes {ambiguousUnphasedRows.toLocaleString()} carrier{' '}
          {ambiguousUnphasedRows === 1 ? 'row' : 'rows'} from assigned-haplotype views.
        </>
      )}
    </p>

    <h4>Reading the Grid</h4>
    <ul>
      <li>
        <strong>Colored blocks</strong> are sequence segments aligned to repeat motif units (e.g.,
        each &quot;T&quot; in a poly-T repeat). Colors correspond to different motifs at multi-motif
        loci; a colored unit can still contain a mismatch.
      </li>
      <li>
        <strong>Dark blocks</strong> are interruption segments not aligned to an expected motif. In
        the expanded sequence, individual non-matching bases are also dark. Interruption positions
        can be clinically significant (e.g., AGG interruptions in FMR1 CGG repeats stabilize the
        tract).
      </li>
      <li>
        <strong>Block width</strong> is proportional to the nucleotide length of each unit.
      </li>
      <li>
        <strong>Units</strong> — total number of motif repeat units in the allele.
      </li>
      <li>
        <strong>Interruptions</strong> — count of interruption segments and their total base length.
      </li>
      <li>
        <strong>Assigned copies</strong> — deterministically haplotype-assigned ALT copies with this
        exact structure, with a population-colored bar. Percentages use only the exact assigned
        copies displayed in this grid.
      </li>
    </ul>

    <h4>Purity Heatmap (Large Expansions)</h4>
    <p>
      For alleles longer than 2kb or with more than 100 repeat units, individual blocks become too
      small to render. Instead, the sequence is divided into 100bp bins and each bin is colored by
      the fraction of bases that exactly match its aligned motif:
    </p>
    <ul>
      <li>
        <strong>Green</strong> — 100% of bases exactly match their aligned motif
      </li>
      <li>
        <strong>Yellow</strong> — approximately 50% exact base matches
      </li>
      <li>
        <strong>Red</strong> — 0% exact base matches
      </li>
    </ul>
    <p>
      This reveals whether purity degrades toward one end (common in unstable expansions) or is
      uniformly distributed.
    </p>

    <h4>Hover</h4>
    <ul>
      <li>Hover over any row to see the raw allele sequence.</li>
      <li>
        In the purity heatmap, hover over a bin to see its bp range and local purity percentage.
      </li>
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

export const AlleleStructureGrid = ({
  structures,
  motifs,
  flankPrefix,
  flankSuffix,
  showAssignedCopies = true,
  ariaLabel = 'Tandem-repeat allele motif structures',
}: {
  structures: AlleleStructure[]
  motifs: string[]
  flankPrefix?: string
  flankSuffix?: string
  showAssignedCopies?: boolean
  ariaLabel?: string
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
    <div aria-label={ariaLabel} style={{ marginTop: 8, maxWidth: '100%', overflowX: 'auto' }}>
      <div style={{ minWidth: STRUCTURE_MAX_GRID_WIDTH + (showAssignedCopies ? 300 : 170) }}>
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
          {showAssignedCopies && <span style={{ width: 120 }}>Assigned copies</span>}
          <button
            type="button"
            aria-label={expandAllSeqs ? 'Hide all allele sequences' : 'Show all allele sequences'}
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
            showAssignedCopies={showAssignedCopies}
            flankPrefix={flankPrefix}
            flankSuffix={flankSuffix}
            motifs={motifs}
            forceExpandSeq={expandAllSeqs}
          />
        ))}

        {/* Show more / less */}
        {hiddenCount > 0 && (
          <button
            type="button"
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
    </div>
  )
}

const SeqToggle = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
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
    title={
      algorithm === 'dp' ? 'Decomposed with trviz DP alignment' : 'Decomposed with greedy regex'
    }
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
          token.type === 'motif' ? MOTIF_COLORS[token.motifIndex % MOTIF_COLORS.length] : null
        const label = token.type === 'motif' ? motifs[token.motifIndex] ?? '?' : 'int'
        return (
          <span
            key={ti}
            style={{ display: 'inline-flex', flexShrink: 0 }}
            title={`${label} (${token.sequence.length}bp)`}
          >
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
                    borderRadius:
                      ci === 0
                        ? '2px 0 0 2px'
                        : ci === token.sequence.length - 1
                        ? '0 2px 2px 0'
                        : 0,
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
  showAssignedCopies,
  flankPrefix,
  flankSuffix,
  motifs,
  forceExpandSeq = false,
}: {
  allele: AlleleStructure
  scale: number
  maxCarriers: number
  totalHaplotypes: number
  showAssignedCopies: boolean
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
      bins.push({
        motifBases: 0,
        totalBases: 0,
        start: b * BIN_SIZE,
        end: Math.min((b + 1) * BIN_SIZE, seqLen),
      })
    }
    let pos = 0
    for (const token of allele.tokens) {
      const tLen = token.sequence.length
      for (let i = 0; i < tLen; i++) {
        const binIdx = Math.min(Math.floor((pos + i) / BIN_SIZE), numBins - 1)
        bins[binIdx].totalBases++
        if (baseMatchesMotif(token, i, motifs)) bins[binIdx].motifBases++
      }
      pos += tLen
    }

    // Compute base-level purity so mismatches within motif-aligned tokens are not
    // incorrectly counted as matching motif sequence.
    let longestExactRun = 0
    let currentExactRun = 0
    for (const token of allele.tokens) {
      for (let i = 0; i < token.sequence.length; i++) {
        if (baseMatchesMotif(token, i, motifs)) {
          currentExactRun++
          longestExactRun = Math.max(longestExactRun, currentExactRun)
        } else {
          currentExactRun = 0
        }
      }
    }

    const matchedBases = bins.reduce((total, bin) => total + bin.motifBases, 0)
    const overallPurity = matchedBases / Math.max(seqLen, 1)

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
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: '#999',
                    marginRight: 2,
                    flexShrink: 0,
                  }}
                >
                  {flankPrefix}
                </span>
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
                      <title>{`bp ${bin.start}–${bin.end}: ${(purity * 100).toFixed(
                        0
                      )}% exact motif-base match`}</title>
                    </rect>
                  )
                })}
                <rect
                  x={0}
                  y={2}
                  width={numBins * binWidth}
                  height={STRUCTURE_ROW_HEIGHT - 4}
                  fill="none"
                  stroke="#ddd"
                  strokeWidth={0.5}
                  rx={1}
                />
              </svg>
              {flankSuffix && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: '#999',
                    marginLeft: 2,
                    flexShrink: 0,
                  }}
                >
                  {flankSuffix}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 9,
                color: '#888',
                marginTop: 1,
              }}
            >
              <span>
                {formatBp(seqLen)} | {(overallPurity * 100).toFixed(0)}% base match | longest exact
                run: {formatBp(longestExactRun)} | {numBins} bins of {BIN_SIZE}bp
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
                <span style={{ color: '#aaa' }}>base match:</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    background: '#c62828',
                    borderRadius: 1,
                  }}
                />
                <span>0%</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    background: '#fdd835',
                    borderRadius: 1,
                  }}
                />
                <span>50%</span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    background: '#2e7d32',
                    borderRadius: 1,
                  }}
                />
                <span>100%</span>
              </span>
            </div>
          </div>

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

          {showAssignedCopies && (
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
                  {' '}
                  ({((allele.totalCarriers / totalHaplotypes) * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
          )}
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
        title={
          allele.sequence.length <= 200
            ? `${allele.sequence} (${allele.sequence.length}bp)`
            : `${allele.sequence.slice(0, 80)}...${allele.sequence.slice(-80)} (${
                allele.sequence.length
              }bp)`
        }
      >
        {/* Motif grid with flanking context */}
        <div
          style={{
            width: STRUCTURE_MAX_GRID_WIDTH,
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {flankPrefix && (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 9,
                color: '#999',
                marginRight: 2,
                flexShrink: 0,
              }}
            >
              {flankPrefix}
            </span>
          )}
          <svg
            width={
              STRUCTURE_MAX_GRID_WIDTH -
              (flankPrefix ? flankPrefix.length * 6 + 4 : 0) -
              (flankSuffix ? flankSuffix.length * 6 + 4 : 0)
            }
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
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 9,
                color: '#999',
                marginLeft: 2,
                flexShrink: 0,
              }}
            >
              {flankSuffix}
            </span>
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
        {showAssignedCopies && (
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
                {' '}
                ({((allele.totalCarriers / totalHaplotypes) * 100).toFixed(0)}%)
              </span>
            </span>
          </div>
        )}
        <AlgorithmBadge algorithm={allele.algorithm} />
        <SeqToggle active={showSeq} onClick={() => setShowSeq(!showSeq)} />
      </div>
      {seqVisible && <SequenceFoldout tokens={allele.tokens} motifs={motifs} />}
    </div>
  )
}
