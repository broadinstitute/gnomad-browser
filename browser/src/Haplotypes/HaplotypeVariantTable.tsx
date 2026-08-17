import React, { useCallback, useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import styled from 'styled-components'
import { getCategoryFromConsequence, getLabelForConsequenceTerm, VEP_CONSEQUENCE_CATEGORIES, VEP_CONSEQUENCE_CATEGORY_LABELS } from '../vepConsequences'
import CategoryFilterControl from '../CategoryFilterControl'
import { SUPERPOPULATION_COLORS } from './colors'
import { getAlleleTypeColor, getVariantCategory } from '../LongReadVariantPage/variantUtils'
import {
  allLongReadVariantTypesSelected,
  getLongReadVariantTypeColor,
  LONG_READ_VARIANT_TYPE_OPTIONS,
  passesLongReadVariantTypeFilters,
  type LongReadVariantTypeFilters,
} from '../LongReadVariantPage/longReadVariantTypes'
import HaplotypeHelpButton from './HelpButton'
import type { HaplotypeGroup, HaplotypeCluster, LRVariant } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import Link from '../Link'
import { decomposeSequence, refineDecompositions } from './trvizDecomposition'
import type { SequenceToken, DecomposeAlgorithm } from './trvizDecomposition'
import {
  AlleleStructureGrid,
  AlleleStructureHelp,
  type AlleleStructure,
} from './TrAlleleStructure'
import { repeatSequenceWithoutSharedAnchor } from './trAlleleStructureData'
import { formatLongReadFrequency, nullableLongReadFrequency } from '../LongReadVariantPage/longReadFrequency'
import { POP_ORDER, type TrDataPoint } from './TRDistributionPlot'
import { aggregateTrLoci, getTrLocusDistribution, getTrLocusKey } from '../LongReadVariantPage/trLocusAggregation'
import { longReadVariantUrl, type LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import { longReadAncestryGroupDisplayId } from '../LongReadVariantPage/longReadAncestryGroups'
import ExpandedTrDistributions from './ExpandedTrDistributions'
import {
  matchesLongReadVariantSearch,
  parseLongReadVariantSearch,
  type LongReadVariantSearchResult,
} from '../LongReadVariantPage/longReadVariantSearch'

type DerivedVariant = LRVariant & {
  source_variant_id?: string
  lr_cohort?: 'hgsvc_hprc' | 'aou'
  group_count: number
  carrier_count: number
  is_tr: boolean
  tr_distribution?: TrDataPoint[]
  min_length_diff?: number | null
  max_length_diff?: number | null
  tr_allele_structures?: AlleleStructure[]
  tr_flank_prefix?: string
  tr_flank_suffix?: string
  _trRawSequences?: Map<string, Record<string, number>> // deferred: raw seqs for lazy decomposition
  short_read_match_id?: string | null
  enveloped_ids?: string[] | null
  cluster_distribution?: ClusterDistributionEntry[]
  active_cluster_count?: number
  search_identifiers?: string[]
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

const formatTrLengthRange = (min: number | null | undefined, max: number | null | undefined) =>
  min == null || max == null ? '—' : `${min}..${max}bp`

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

// --- Mini group AF bar ---

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

// --- Lazy TR decomposition (deferred until row expansion) ---

const trDecomposeCache = new Map<string, { structures: AlleleStructure[]; flankPrefix: string; flankSuffix: string }>()

function lazyDecomposeTr(v: DerivedVariant): { structures: AlleleStructure[]; flankPrefix: string; flankSuffix: string } | null {
  if (!v._trRawSequences || v._trRawSequences.size === 0 || !v.tr_motifs) return null

  const cacheKey = v.variant_id
  const cached = trDecomposeCache.get(cacheKey)
  if (cached) return cached

  console.time(`[perf] TR decompose (lazy) pos=${v.pos} (${v._trRawSequences.size} alleles)`)
  const motifs = (v.tr_motifs as string).split(',').map((m: string) => m.trim()).filter(Boolean)
  if (motifs.length === 0) return null

  const refSeq = v.ref as string
  const refRepeat = repeatSequenceWithoutSharedAnchor(refSeq, refSeq)
  const refResult = decomposeSequence(refRepeat, motifs)

  let flankPrefix = ''
  let flankSuffix = ''
  if (refResult.tokens.length > 0 && refResult.tokens[0].type === 'interruption') {
    flankPrefix = refResult.tokens[0].sequence.slice(-5)
  }
  if (refResult.tokens.length > 0 && refResult.tokens[refResult.tokens.length - 1].type === 'interruption') {
    flankSuffix = refResult.tokens[refResult.tokens.length - 1].sequence.slice(0, 5)
  }

  const interim: Array<{ seq: string; popCounts: Record<string, number>; tokens: SequenceToken[]; algorithm: DecomposeAlgorithm }> = []
  for (const [seq, popCounts] of v._trRawSequences) {
    const repeatSeq = repeatSequenceWithoutSharedAnchor(refSeq, seq)
    const { tokens, algorithm } = decomposeSequence(repeatSeq, motifs)
    interim.push({ seq, popCounts, tokens, algorithm })
  }

  const allTokenLists = interim.map((item) => item.tokens)
  const refined = refineDecompositions(allTokenLists)

  const structures = interim.map((item, i) => {
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
  structures.sort((a, b) => b.totalCarriers - a.totalCarriers)
  console.timeEnd(`[perf] TR decompose (lazy) pos=${v.pos} (${v._trRawSequences.size} alleles)`)

  const result = { structures, flankPrefix, flankSuffix }
  trDecomposeCache.set(cacheKey, result)
  return result
}

// --- Helper ---

const isTrVariant = (v: { allele_type?: string }): boolean =>
  (v.allele_type || '').toLowerCase() === 'trv'

const sourceIdFromAltId = (variantId: string | undefined): string | undefined => {
  const match = variantId?.match(/^(.*)~[1-9][0-9]*$/)
  return match?.[1]
}

/** A source record is the authoritative TR locus identity. Legacy payloads do
 * not carry it, so only then fall back to an exact normalized reference span. */
const getHaplotypeTrLocusKey = (v: any): string => {
  const scope = v.lr_cohort ? `cohort:${v.lr_cohort}:` : ''
  const sourceId = v.source_variant_id || sourceIdFromAltId(v.variant_id)
  if (sourceId) return `${scope}source:${sourceId}`
  const chrom = String(v.chrom || '').replace(/^chr/i, '')
  const end = v.end ?? (v.pos + Math.max(v.ref?.length || 1, 1) - 1)
  return `${scope}coordinates:${chrom}:${v.pos}:${end}`
}

const getHaplotypeVariantKey = (v: any): string =>
  isTrVariant(v)
    ? getHaplotypeTrLocusKey(v)
    : `variant:${v.variant_id || `${v.chrom}:${v.pos}:${v.ref}:${v.alt}`}`

export type ClusterDistributionEntry = { cluster_id: string; af: number }

/** Index consensus variants once, then materialize stable, dense cluster arrays
 * only for keys that occur in at least one cluster consensus. */
export const buildClusterDistributionByKey = (
  clusters: HaplotypeCluster[] | undefined
): Map<string, ClusterDistributionEntry[]> => {
  const sparseAfByKey = new Map<string, Map<number, number>>()
  if (!clusters || clusters.length === 0) return new Map()

  clusters.forEach((cluster, clusterIndex) => {
    for (const consensus of cluster.consensus_variants) {
      const key = getHaplotypeVariantKey(consensus.variant)
      let afByCluster = sparseAfByKey.get(key)
      if (!afByCluster) {
        afByCluster = new Map()
        sparseAfByKey.set(key, afByCluster)
      }
      afByCluster.set(
        clusterIndex,
        Math.max(afByCluster.get(clusterIndex) ?? 0, consensus.cluster_af)
      )
    }
  })

  const distributions = new Map<string, ClusterDistributionEntry[]>()
  for (const [key, afByCluster] of sparseAfByKey) {
    distributions.set(key, clusters.map((cluster, clusterIndex) => ({
      cluster_id: cluster.cluster_id,
      af: afByCluster.get(clusterIndex) ?? 0,
    })))
  }
  return distributions
}

export const getActiveClusterCount = (
  distribution: ClusterDistributionEntry[] | undefined
): number | undefined => distribution?.filter(({ af }) => af > 0).length

const getTrLengthDiff = (v: any): number => {
  if (typeof v.alt === 'string' && typeof v.ref === 'string' && !/^<.*>$/.test(v.alt)) {
    return v.alt.length - v.ref.length
  }
  return Number.isFinite(v.allele_length) ? v.allele_length : 0
}

const getMatchLevel = (matchType: string | null): 'exact' | 'truvari' | 'none' => {
  if (!matchType) return 'none'
  const upper = matchType.toUpperCase()
  if (upper === 'EXACT') return 'exact'
  if (upper.startsWith('TRUVARI')) return 'truvari'
  return 'none'
}

const truncateAllele = (allele: string, max = 8) =>
  allele.length > max ? allele.slice(0, max) + '…' : allele

/** Build a display-friendly variant ID.
 *  - Short variants (ref/alt both ≤20bp): chrom-pos-ref-alt (standard gnomAD format)
 *  - True SVs (symbolic alleles like <DEL>, or either allele >20bp): chrom-pos-SVTYPE-length
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
  // Strip 'chr' prefix to match gnomAD variant ID convention (e.g. '1-55039792-G-A')
  const chrom = v.chrom.replace(/^chr/i, '')
  const isSymbolic = v.alt.startsWith('<') && v.alt.endsWith('>')
  const isLongAllele = v.ref.length > 20 || v.alt.length > 20

  if (isSymbolic || isLongAllele) {
    const svtype = v.allele_type || 'SV'
    const len = v.allele_length ? Math.abs(v.allele_length) : Math.abs(v.alt.length - v.ref.length)
    return `${chrom}-${v.pos}-${svtype.toUpperCase()}-${len}`
  }

  return `${chrom}-${v.pos}-${v.ref}-${v.alt}`
}

// --- Memoized table row ---

type TableRowProps = {
  v: DerivedVariant
  i: number
  isExpanded: boolean
  mode: 'summary' | 'haplotype'
  showGroupAf: boolean
  totalGroups: number
  totalClusters: number
  totalSamples: number
  ambiguousUnphasedRows: number
  isClusteredView: boolean
  highlightedPosition: number | null
  variantDict: Map<string, any>
  lrCohort: LongReadCohort
  onHoverVariant?: (position: number | null) => void
  onRowClick?: (pos: number) => void
  toggleExpand: (id: string) => void
}

const TableRow = React.memo(function TableRow({
  v,
  i,
  isExpanded,
  mode,
  showGroupAf,
  totalGroups,
  totalClusters,
  totalSamples,
  ambiguousUnphasedRows,
  isClusteredView,
  highlightedPosition,
  variantDict,
  lrCohort,
  onHoverVariant,
  onRowClick,
  toggleExpand,
}: TableRowProps) {
  const COL_COUNT = showGroupAf ? 12 : 11
  return (
    <React.Fragment key={`${v.pos}-${v.variant_id}-${i}`}>
      <tr
        data-position={v.pos}
        onMouseEnter={() => onHoverVariant?.(v.pos)}
        onMouseLeave={() => onHoverVariant?.(null)}
        style={{
          cursor: 'pointer',
          background: highlightedPosition === v.pos
            ? '#fff3cd'
            : isExpanded ? '#fff8e1' : undefined,
          transition: 'background 0.3s ease',
        }}
        onClick={() => {
          if (v.is_tr) toggleExpand(v.variant_id)
          onRowClick?.(v.pos)
        }}
      >
        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {v.is_tr && (
            <ExpandToggle>{isExpanded ? '▼' : '▶'}</ExpandToggle>
          )}
          <Link
            to={longReadVariantUrl(v.variant_id, v.lr_cohort || lrCohort)}
            preserveSelectedDataset={false}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {v.source_variant_id || v.variant_id}
          </Link>
        </td>
        <td>
          <TypeDot $color={getAlleleTypeColor(v.allele_type)} />
          {v.is_tr ? 'TR' : v.allele_type}
        </td>
        <td className="numeric">
          {v.is_tr
            ? formatTrLengthRange(v.min_length_diff, v.max_length_diff)
            : v.allele_length}
        </td>
        <td className="numeric"><span title={v.freq.af == null ? 'Unavailable' : undefined}>{formatLongReadFrequency(v.freq.af, 4)}</span></td>
        {mode === 'summary' && <td className="numeric"><span title={v.freq.ac == null ? 'Unavailable' : undefined}>{formatLongReadFrequency(v.freq.ac)}</span></td>}
        {mode === 'summary' && <td className="numeric"><span title={v.freq.an == null ? 'Unavailable' : undefined}>{formatLongReadFrequency(v.freq.an)}</span></td>}
        {mode === 'haplotype' && (
          <td className="numeric">
            {isClusteredView && v.cluster_distribution ? (
              <>
                {v.active_cluster_count} / {totalClusters}
              </>
            ) : (
              <>{v.group_count} / {totalGroups}</>
            )}
          </td>
        )}
        {mode === 'haplotype' && (
          <td className="numeric">
            {v.carrier_count} / {totalSamples}
          </td>
        )}
        {showGroupAf && (
          <td>
            <PopAfBar variant={v} />
          </td>
        )}
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
          ) : v.dbsnp_id ? (
            <span style={{ color: '#666', fontFamily: 'monospace', fontSize: 11 }}>{v.dbsnp_id}</span>
          ) : (
            <span style={{ color: '#ccc' }}>—</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <TrExpandedRow>
          <td colSpan={COL_COUNT} style={{ padding: '8px 16px', background: '#fffde7' }}>
            {/* Primary sequence-level view: exact assigned ALT copies only. */}
            {mode === 'haplotype' && v.tr_motifs && (v.tr_allele_structures || v._trRawSequences) && (() => {
              const decomposed = v.tr_allele_structures
                ? { structures: v.tr_allele_structures, flankPrefix: v.tr_flank_prefix || '', flankSuffix: v.tr_flank_suffix || '' }
                : lazyDecomposeTr(v)
              if (!decomposed || decomposed.structures.length === 0) return null
              return (
                <section
                  aria-label="Deterministically haplotype-assigned motif structures"
                  style={{
                    marginBottom: 14,
                    padding: '10px 12px',
                    border: '1px solid #e0d8bd',
                    borderRadius: 4,
                    background: '#fff',
                    whiteSpace: 'normal',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <h3 style={{ margin: 0 }}>Assigned motif structures</h3>
                    <HaplotypeHelpButton title="About assigned motif structures">
                      <AlleleStructureHelp ambiguousUnphasedRows={ambiguousUnphasedRows} />
                    </HaplotypeHelpButton>
                  </div>
                  {ambiguousUnphasedRows > 0 && (
                    <div style={{ margin: '4px 0 0', fontSize: 12, color: '#8a4b08' }}>
                      Ambiguous unphased carrier rows excluded: {ambiguousUnphasedRows.toLocaleString()}
                    </div>
                  )}
                  <AlleleStructureGrid
                    structures={decomposed.structures}
                    motifs={v.tr_motifs!.split(',').map((m: string) => m.trim())}
                    flankPrefix={decomposed.flankPrefix}
                    flankSuffix={decomposed.flankSuffix}
                  />
                </section>
              )
            })()}
            <ExpandedTrDistributions
              variantId={v.variant_id}
              lrCohort={v.lr_cohort || lrCohort}
            />
            <div style={{ fontSize: 11, color: '#555' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  TR Locus: {v.chrom}:{v.pos}
                  {v.tr_id && <span style={{ fontWeight: 400, marginLeft: 8, color: '#888' }}>({v.tr_id})</span>}
                </div>
                {v.tr_distribution && (
                  <>
                    <div>Allele length range: {v.min_length_diff} to {v.max_length_diff}bp</div>
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
                        {longReadAncestryGroupDisplayId(pop)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overlapping variant calls (enveloped variants) */}
                {v.enveloped_ids && v.enveloped_ids.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 12 }}>
                        Overlapping variant calls ({v.enveloped_ids.length})
                      </h4>
                      <HaplotypeHelpButton title="About overlapping variant calls">
                        <p style={{ margin: 0 }}>
                          These variants were independently called within this repeat region and may
                          be artifacts of repeat-length variation.
                        </p>
                      </HaplotypeHelpButton>
                    </div>
                    <ul style={{ fontSize: 11, margin: 0, paddingLeft: 16 }}>
                      {v.enveloped_ids.map((id: string) => {
                        const envVar = variantDict.get(id)
                        if (!envVar) {
                          return <li key={id} style={{ marginBottom: 4 }}>{id} (data not loaded)</li>
                        }
                        return (
                          <li key={id} style={{ marginBottom: 4 }}>
                            <Link to={longReadVariantUrl(id, v.lr_cohort || lrCohort)} preserveSelectedDataset={false}>{id}</Link>
                            {' '}({envVar.allele_type}, AC={envVar.freq?.all?.ac == null ? 'Unavailable' : envVar.freq.all.ac})
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
            </div>
          </td>
        </TrExpandedRow>
      )}
    </React.Fragment>
  )
})

// --- Main component ---

export type VariantTypeFilters = LongReadVariantTypeFilters

type HaplotypeVariantTableProps = {
  mode?: 'summary' | 'haplotype'
  lrCohort?: 'hgsvc_hprc' | 'aou'
  summaryVariants?: any[]
  haplotypeGroups?: { groups: HaplotypeGroup[]; clusters?: HaplotypeCluster[] }
  sampleMetadata?: SampleMetadataMap
  totalGroups?: number
  ambiguousUnphasedRows?: number
  onHoverVariant?: (position: number | null) => void
  onVisibleVariantChange?: (pos: number) => void
  onFilteredVariantsChange?: (variantIds: Set<string>) => void
  onRowClick?: (pos: number) => void
  maxHeight?: string
  isClusteredView?: boolean
  selectedClusterId?: string | null
  onClearClusterFilter?: () => void
  searchText?: string
  parsedSearch?: LongReadVariantSearchResult
  typeFilters?: VariantTypeFilters
  onTypeFiltersChange?: (filters: VariantTypeFilters) => void
}

export type HaplotypeVariantTableHandle = {
  scrollToPosition: (pos: number) => void
}

// Stable default references — destructuring defaults like `= []` create new objects
// every render, which invalidates useMemo deps and causes the 2-second variants
// derivation to recompute on every scroll tick.
const EMPTY_VARIANTS: any[] = []
const EMPTY_HAPLOTYPE_GROUPS: { groups: HaplotypeGroup[]; clusters?: HaplotypeCluster[] } = { groups: [] }
const EMPTY_SAMPLE_METADATA = new Map() as SampleMetadataMap

const HaplotypeVariantTable = forwardRef<HaplotypeVariantTableHandle, HaplotypeVariantTableProps>(function HaplotypeVariantTable({
  mode = 'haplotype',
  lrCohort = 'hgsvc_hprc',
  summaryVariants = EMPTY_VARIANTS,
  haplotypeGroups = EMPTY_HAPLOTYPE_GROUPS,
  sampleMetadata = EMPTY_SAMPLE_METADATA,
  ambiguousUnphasedRows = 0,
  onHoverVariant,
  onVisibleVariantChange,
  onFilteredVariantsChange,
  onRowClick,
  maxHeight = '500px',
  isClusteredView = false,
  selectedClusterId = null,
  onClearClusterFilter,
  searchText: searchTextProp = '',
  parsedSearch: parsedSearchProp,
  typeFilters: externalTypeFilters,
  onTypeFiltersChange,
}, ref) {
  const [sort, setSort] = useState<SortConfig>({ key: 'pos', direction: 'asc' })
  const searchText = searchTextProp
  const parsedSearch = useMemo(
    () => parsedSearchProp || parseLongReadVariantSearch(searchText),
    [parsedSearchProp, searchText]
  )
  const searchIsActive = parsedSearch.status !== 'empty'
  const [internalTypeFilters, setInternalTypeFilters] = useState<VariantTypeFilters>(allLongReadVariantTypesSelected)
  const typeFilters = externalTypeFilters || internalTypeFilters
  const setTypeFilters = onTypeFiltersChange || setInternalTypeFilters
  const [consequenceFilters, setConsequenceFilters] = useState<Record<string, boolean>>({
    lof: true,
    missense: true,
    synonymous: true,
    other: true,
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null)
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Reset visible window when folding all TR rows — prevents stale spacers
  // from creating whitespace when virtualization re-enables.
  useEffect(() => {
    if (expandedRows.size === 0 && tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0
      setVisibleWindow({ startRow: 0, endRow: Math.ceil(500 / ROW_HEIGHT) + 2 * VISIBLE_BUFFER_ROWS })
    }
  }, [expandedRows.size])

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
          // Flash highlight
          if (highlightTimeout.current) clearTimeout(highlightTimeout.current)
          setHighlightedPosition(rowPos)
          highlightTimeout.current = setTimeout(() => setHighlightedPosition(null), 2000)
          return
        }
      }
    },
  }), [])

  // O(1) lookup for resolving enveloped variant IDs to full objects
  const variantDict = useMemo(() => {
    return new Map(summaryVariants.map((v: any) => [v.variant_id, v]))
  }, [summaryVariants])

  // Derive variant list for summary mode (cheap, depends on zoom-filtered variants)
  const summaryDerivedVariants = useMemo(() => {
    if (mode !== 'summary') return []
    const trLoci = aggregateTrLoci(
      summaryVariants
        .filter((v: any) => isTrVariant(v))
        .map((v: any) => ({ ...v, allele_length: v.allele_length ?? v.length ?? null }))
    )
    const trLociByKey = new Map(trLoci.map((locus) => [locus.key, locus]))

    const emittedTrLoci = new Set<string>()
    return summaryVariants.flatMap((input: any) => {
      const isTr = isTrVariant(input)
      const locus = isTr ? trLociByKey.get(getTrLocusKey(input)) : undefined
      if (locus) {
        if (emittedTrLoci.has(locus.key)) return []
        emittedTrLoci.add(locus.key)
      }

      const v = locus?.representative || input
      const alleles = locus?.alleles || [v]
      const trDistribution = locus ? getTrLocusDistribution(alleles) : []
      const SUPERPOPS = new Set(['afr', 'amr', 'eas', 'nfe', 'sas'])
      const populations = (v.freq?.populations || [])
        .filter((p: any) => SUPERPOPS.has(p.id) && p.af != null)
        .map((p: any) => ({ id: p.id, af: p.af, ac: p.ac ?? null }))
      const aggregateAc = locus
        ? alleles.reduce((sum, allele) => sum + (Number.isFinite(allele.freq?.all?.ac) ? allele.freq.all.ac : 0), 0)
        : v.freq?.all?.ac
      const aggregateAn = locus
        ? Math.max(0, ...alleles.map((allele) => Number.isFinite(allele.freq?.all?.an) ? allele.freq.all.an : 0))
        : v.freq?.all?.an
      const aggregateAf = locus && aggregateAn > 0 ? aggregateAc / aggregateAn : v.freq?.all?.af

      return [{
        variant_id: v.variant_id,
        source_variant_id: v.source_variant_id,
        lr_cohort: v.lr_cohort,
        chrom: v.chrom,
        pos: v.pos,
        end: v.end || null,
        ref: v.ref,
        alt: v.alt,
        allele_type: v.allele_type,
        allele_length: v.allele_length ?? v.length ?? null,
        freq: nullableLongReadFrequency({ af: aggregateAf, ac: aggregateAc, an: aggregateAn }),
        populations,
        rsid: (v.rsids || [])[0] || '',
        major_consequence: v.major_consequence || null,
        cadd_phred: v.cadd_phred ?? null,
        phylop: v.phylop ?? null,
        sv_consequences: v.sv_consequences || null,
        dbsnp_id: null,
        tr_id: null,
        tr_motifs: v.motifs?.join(',') || null,
        gnomad_str: null,
        allele_methylation: null,
        motif_counts: null,
        allele_purity: null,
        group_count: 0,
        carrier_count: aggregateAc ?? null,
        short_read_match_id: v.short_read_match_id || null,
        is_tr: isTr,
        tr_distribution: trDistribution.length > 0 ? trDistribution : undefined,
        min_length_diff: locus?.minLengthDiff ?? null,
        max_length_diff: locus?.maxLengthDiff ?? null,
        enveloped_ids: Array.from(new Set(alleles.flatMap((allele) => allele.enveloped_ids || []))),
        search_identifiers: Array.from(new Set(alleles.flatMap((allele) => [
          allele.variant_id,
          allele.source_variant_id,
          allele.short_read_match_id,
          allele.gnomad_str,
          ...(allele.rsids || []),
        ].filter(Boolean)))),
      } as DerivedVariant]
    })
  }, [mode, summaryVariants])

  // Derive unique variant list for haplotype mode, grouping TRVs by position.
  // This is expensive (~8s for large regions) and must NOT depend on summaryVariants
  // (which changes on zoom). Only haplotypeGroups/sampleMetadata should trigger recomputation.
  const haplotypeDerivedVariants = useMemo(() => {
    if (mode !== 'haplotype') return []
    console.time('[perf] HaplotypeVariantTable derive variants')

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
        // Unique carrier/haplotype allele occurrences. The key includes sample
        // identity (and diplotype side where available), never the group row.
        trCarrierAlleles?: Map<string, { lengthDiff: number; pop: string; alt: string }>
        searchIdentifiers: Set<string>
      }
    >()

    const ensureEntry = (v: any) => {
      const key = getHaplotypeVariantKey(v)
      let entry = map.get(key)
      if (!entry) {
        entry = {
          variant: v,
          groupCount: 0,
          carrierIds: new Set(),
          searchIdentifiers: new Set(),
          ...(isTrVariant(v) ? { trCarrierAlleles: new Map() } : {}),
        }
        map.set(key, entry)
      }
      ;[
        v.variant_id,
        v.source_variant_id,
        v.short_read_match_id,
        v.gnomad_str,
        v.tr_id,
        ...(v.rsids || []),
        v.rsid,
      ].filter(Boolean).forEach((identifier) => entry!.searchIdentifiers.add(String(identifier)))
      return { key, entry }
    }

    const recordCarrier = (v: any, sampleId: string, haplotypeSlot = '') => {
      const { entry } = ensureEntry(v)
      entry.carrierIds.add(sampleId)
      if (!isTrVariant(v) || !entry.trCarrierAlleles) return
      const pop = sampleMetadata.get(sampleId)?.superpopulation || 'N/A'
      // ALT record IDs/indexes can be repeated for the same observed sequence.
      // Per carrier/haplotype, sequence + signed length is the allele occurrence.
      const sourceAlt = `${getTrLengthDiff(v)}:${v.alt || ''}`
      const occurrenceKey = `${sampleId}:${haplotypeSlot}:${sourceAlt}`
      if (!entry.trCarrierAlleles.has(occurrenceKey)) {
        entry.trCarrierAlleles.set(occurrenceKey, {
          lengthDiff: getTrLengthDiff(v), pop, alt: v.alt,
        })
      }
    }

    for (const group of haplotypeGroups.groups) {
      const dg = group as any
      const isDiplotype = Boolean(dg.is_diplotype)
      const groupVariants = isDiplotype
        ? [
            ...(dg.haplotypeA?.variants || []), ...(dg.haplotypeB?.variants || []),
            ...(dg.below_thresholdA?.variants || []), ...(dg.below_thresholdB?.variants || []),
          ]
        : [...group.variants.variants, ...(group.below_threshold?.variants || [])]

      // Group prevalence is one occurrence per locus per group, regardless of
      // repeated ALT rows or the locus being present on both diplotype sides.
      const groupKeys = new Set<string>()
      groupVariants.forEach((v) => {
        const { key, entry } = ensureEntry(v)
        if (!groupKeys.has(key)) {
          groupKeys.add(key)
          entry.groupCount++
        }
      })

      if (isDiplotype) {
        for (const sample of dg.samples) {
          // Canonical group variants define the diplotype signature; optional
          // sample sets retain each carrier's exact TR ALT from the sidecar.
          ;(sample.haplotypeA?.variants || dg.haplotypeA?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id, 'A'))
          ;(sample.haplotypeB?.variants || dg.haplotypeB?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id, 'B'))
          ;(sample.below_thresholdA?.variants || dg.below_thresholdA?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id, 'A'))
          ;(sample.below_thresholdB?.variants || dg.below_thresholdB?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id, 'B'))
        }
      } else {
        // Above-threshold sample variant_sets contain the carrier-specific TR
        // ALT substituted by inflateGroups; group.variants only has a representative ALT.
        for (const sample of group.samples) {
          const sampleVariants = sample.variant_sets?.flatMap((set: any) => set.variants || []) || group.variants.variants
          sampleVariants.forEach((v: any) => recordCarrier(v, sample.sample_id, String(sample.vcf_strand)))
        }
        // Below-threshold non-diploid rows are group representatives and do not
        // retain per-carrier ALT bytes. Do not present them as exact structures.
      }
    }

    // Build cluster distributions without rescanning each cluster's complete
    // consensus list for every distinct row key.
    const clusterDistByKey = buildClusterDistributionByKey(haplotypeGroups.clusters)

    // Phase 2: build DerivedVariant array
    const result: DerivedVariant[] = []
    for (const [key, { variant: v, groupCount, carrierIds, trCarrierAlleles, searchIdentifiers }] of map) {
      const isTrv = isTrVariant(v)

      // Build TR distribution from accumulated carrier data
      let trDistribution: TrDataPoint[] | undefined
      let minLengthDiff: number | undefined
      let maxLengthDiff: number | undefined

      if (isTrv && trCarrierAlleles && trCarrierAlleles.size > 0) {
        const distMap = new Map<string, number>() // "lengthDiff:pop" -> count
        for (const { lengthDiff, pop } of trCarrierAlleles.values()) {
          const dkey = `${lengthDiff}:${pop}`
          distMap.set(dkey, (distMap.get(dkey) || 0) + 1)
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

      // Store unique raw TR sequences for lazy decomposition (deferred to row expansion).
      const rawSeqs = isTrv && trCarrierAlleles
        ? Array.from(trCarrierAlleles.values()).reduce((sequences, allele) => {
            if (!allele.alt || allele.alt.length > 10000) return sequences
            let popCounts = sequences.get(allele.alt)
            if (!popCounts) {
              popCounts = {}
              sequences.set(allele.alt, popCounts)
            }
            popCounts[allele.pop] = (popCounts[allele.pop] || 0) + 1
            return sequences
          }, new Map<string, Record<string, number>>())
        : undefined

      // Preserve the canonical browser ID supplied by the Y1 haplotype query,
      // including provenance/ALT identity (for example, `chr22-…~2`). Falling
      // back to a synthesized locus ID can silently navigate to the wrong allele.
      const variantId = v.variant_id || (isTrv
        ? `${v.chrom.replace(/^chr/i, '')}-${v.pos}-TRV`
        : buildVariantId(v))

      const af = isTrv
        ? carrierIds.size / Math.max(1, sampleCount)
        : v.freq.af

      result.push({
        // LRVariant base fields
        variant_id: variantId,
        source_variant_id: v.source_variant_id || (isTrv ? sourceIdFromAltId(v.variant_id) : undefined),
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
        dbsnp_id: v.dbsnp_id ?? null,
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
        tr_allele_structures: undefined,
        tr_flank_prefix: undefined,
        tr_flank_suffix: undefined,
        _trRawSequences: rawSeqs,
        short_read_match_id: v.short_read_match_id || null,
        enveloped_ids: v.enveloped_ids || null,
        cluster_distribution: clusterDistByKey.get(key),
        active_cluster_count: getActiveClusterCount(clusterDistByKey.get(key)),
        search_identifiers: Array.from(searchIdentifiers),
      })
    }

    console.log(`[perf] HaplotypeVariantTable: ${result.length} derived variants (${result.filter(v => v.is_tr).length} TR)`)
    console.timeEnd('[perf] HaplotypeVariantTable derive variants')
    return result
  }, [mode, haplotypeGroups, sampleMetadata])

  const variants = mode === 'summary' ? summaryDerivedVariants : haplotypeDerivedVariants

  const totalGroups = haplotypeGroups.groups.length
  const totalClusters = haplotypeGroups.clusters?.length ?? 0
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

    // Cluster filter (from track click)
    if (selectedClusterId) {
      list = list.filter(v =>
        v.cluster_distribution?.some(c => c.cluster_id === selectedClusterId && c.af > 0)
      )
    }

    // Type filter
    list = list.filter((v) => passesLongReadVariantTypeFilters(v.allele_type, typeFilters))

    // Consequence category filter
    list = list.filter((v) => {
      const cat = getCategoryFromConsequence(v.major_consequence) || 'other'
      return consequenceFilters[cat]
    })

    // Search uses the same normalized parser/matcher as summary tracks and haplotypes.
    if (searchIsActive) {
      list = list.filter((variant) => matchesLongReadVariantSearch(variant, parsedSearch))
    }

    return list
  }, [variants, typeFilters, consequenceFilters, searchIsActive, parsedSearch, selectedClusterId])

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

  // Debounced callback for filtered variant IDs → track dimming (Phase 3)
  const debouncedFilterNotify = useMemo(
    () => {
      let timer: ReturnType<typeof setTimeout> | null = null
      return (ids: Set<string>) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => onFilteredVariantsChange?.(ids), 300)
      }
    },
    [onFilteredVariantsChange]
  )

  // Search visibility is applied directly with the shared matcher. This callback
  // remains for cluster/consequence dimming and must update even when two filters
  // happen to produce the same number of variants.
  const isFiltered = selectedClusterId != null ||
    Object.values(consequenceFilters).some(v => !v)

  useEffect(() => {
    if (!onFilteredVariantsChange) return undefined
    debouncedFilterNotify(isFiltered ? new Set(filtered.map((variant) => variant.variant_id)) : new Set())
    return undefined
  }, [onFilteredVariantsChange, debouncedFilterNotify, isFiltered, filtered])

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

  const variantTypeCategories = LONG_READ_VARIANT_TYPE_OPTIONS
    .filter((option) => option.id !== 'all')
    .map((option) => ({
      id: option.id,
      label: option.label,
      color: getLongReadVariantTypeColor(option.id as Exclude<typeof option.id, 'all'>),
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
      'dbsnp_id',
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
        v.dbsnp_id ?? '',
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
    <TableContainer id="haplotype-variant-table-container">
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
        {selectedClusterId && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', background: '#e3f2fd', borderRadius: 12,
            fontSize: 12, color: '#1565c0',
          }}>
            Filtered to Cluster {selectedClusterId}
            <button
              onClick={onClearClusterFilter}
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, color: '#1565c0', padding: 0, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </span>
        )}
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
                <th className="numeric" onClick={() => handleSort(isClusteredView ? 'active_cluster_count' : 'group_count')}>
                  {isClusteredView ? 'Clusters' : 'Haplotypes'}{sortIndicator(isClusteredView ? 'active_cluster_count' : 'group_count')}
                </th>
              )}
              {mode === 'haplotype' && (
                <th className="numeric" onClick={() => handleSort('carrier_count')}>
                  Carriers{sortIndicator('carrier_count')}
                </th>
              )}
              {!(mode === 'summary' && lrCohort === 'aou') && <th>Grp AF</th>}
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
                        showGroupAf={!(mode === 'summary' && lrCohort === 'aou')}
                        totalGroups={totalGroups}
                        totalClusters={totalClusters}
                        totalSamples={totalSamples}
                        ambiguousUnphasedRows={ambiguousUnphasedRows}
                        isClusteredView={isClusteredView}
                        highlightedPosition={highlightedPosition}
                        variantDict={variantDict}
                        lrCohort={lrCohort}
                        onHoverVariant={onHoverVariant}
                        onRowClick={onRowClick}
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




