import React, { useCallback, useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import styled from 'styled-components'
import { Badge, Button } from '@gnomad/ui'
import { parseTrLocusId, trLocusUrl } from '@gnomad/dataset-metadata/longReadTrLocusId'
import {
  getTrLocusRowDisplay,
  TrLocusBoundsContract,
  TrLocusComponentSummaryContract,
  TrLocusPresentationContract,
  TrLocusRowDisplay,
} from '@gnomad/dataset-metadata/longReadTrLocusPresentation'
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
import Link from '../Link'
import { formatLongReadFrequency, nullableLongReadFrequency } from '../LongReadVariantPage/longReadFrequency'
import { aggregateTrLoci, getTrLocusKey } from '../LongReadVariantPage/trLocusAggregation'
import { longReadVariantUrl, type LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  formatLongReadAlleleDisplay,
  formatLongReadVariantId,
} from '../LongReadVariantPage/formatLongReadVariantId'
import {
  matchesLongReadVariantSearch,
  parseLongReadVariantSearch,
  type LongReadVariantSearchResult,
} from '../LongReadVariantPage/longReadVariantSearch'
import { showNotification } from '../Notifications'
import userPreferences from '../userPreferences'
import VariantTableConfigurationModal from '../VariantList/VariantTableConfigurationModal'

type DerivedVariant = LRVariant & {
  source_variant_id?: string
  tr_locus_id?: string | null
  tr_id?: string | null
  tr_locus_presentation?: TrLocusPresentationContract | null
  tr_locus_bounds?: TrLocusBoundsContract | null
  tr_locus_component_summary?: TrLocusComponentSummaryContract | null
  lr_cohort?: 'hgsvc_hprc' | 'aou'
  group_count: number
  carrier_count: number
  is_tr: boolean
  min_length_diff?: number | null
  max_length_diff?: number | null
  delta_unavailable_reason?: string | null
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

type LongReadVariantTableColumnKey =
  | 'source_variant_id'
  | 'allele_type'
  | 'allele_length'
  | 'lr_af'
  | 'ac'
  | 'an'
  | 'group_count'
  | 'carrier_count'
  | 'group_af'
  | 'short_read_match_id'
  | 'cadd_phred'
  | 'phylop'
  | 'major_consequence'
  | 'rsid'

export const DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS: LongReadVariantTableColumnKey[] = [
  'allele_type',
  'allele_length',
  'lr_af',
  'ac',
  'an',
  'group_count',
  'carrier_count',
  'group_af',
  'short_read_match_id',
  'cadd_phred',
  'phylop',
  'major_consequence',
  'rsid',
]

export const LONG_READ_VARIANT_TABLE_COLUMNS = [
  { key: 'variant_id', heading: 'Variant', description: 'Human-readable chromosome, position, and allele or event identity' },
  { key: 'source_variant_id', heading: 'Variant ID', description: 'Exact ID from the source VCF record' },
  { key: 'allele_type', heading: 'Type', description: 'Long-read allele type' },
  { key: 'allele_length', heading: 'Length', description: 'Signed or represented allele length' },
  { key: 'lr_af', heading: 'LR AF', description: 'Long-read allele frequency' },
  { key: 'ac', heading: 'AC', description: 'Long-read allele count (summary view)' },
  { key: 'an', heading: 'AN', description: 'Long-read allele number (summary view)' },
  { key: 'group_count', heading: 'Groups / Clusters', description: 'Displayed haplotype groups or active clusters containing the variant' },
  { key: 'carrier_count', heading: 'Carriers', description: 'Unique individuals containing the variant' },
  { key: 'group_af', heading: 'Grp AF', description: 'Long-read allele frequency by genetic ancestry group' },
  { key: 'short_read_match_id', heading: 'SR Match', description: 'Matching gnomAD v4 short-read variant' },
  { key: 'cadd_phred', heading: 'CADD', description: 'CADD PHRED score' },
  { key: 'phylop', heading: 'phyloP', description: 'phyloP conservation score' },
  { key: 'major_consequence', heading: 'Consequence', description: 'Most severe VEP consequence' },
  { key: 'rsid', heading: 'rsID', description: 'dbSNP rsID' },
] as const

const LONG_READ_VARIANT_TABLE_PREFERENCE = 'longReadVariantTableColumns'
const VALID_LONG_READ_VARIANT_TABLE_COLUMNS = new Set(
  LONG_READ_VARIANT_TABLE_COLUMNS
    .map((column) => column.key)
    .filter((key): key is LongReadVariantTableColumnKey => key !== 'variant_id')
)

const getInitialLongReadVariantTableColumns = (): LongReadVariantTableColumnKey[] => {
  try {
    const saved = userPreferences.getPreference(LONG_READ_VARIANT_TABLE_PREFERENCE)
    if (Array.isArray(saved)) {
      return saved.filter((key): key is LongReadVariantTableColumnKey =>
        VALID_LONG_READ_VARIANT_TABLE_COLUMNS.has(key)
      )
    }
  } catch (_error) {
    // Fall through to the stable product defaults when preferences are unavailable.
  }
  return DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS
}

const columnIsApplicable = (
  key: LongReadVariantTableColumnKey,
  mode: 'summary' | 'haplotype',
  showGroupAf: boolean,
  showGroupCount: boolean
) => {
  if (key === 'ac' || key === 'an') return mode === 'summary'
  if (key === 'group_count') return mode === 'haplotype' && showGroupCount
  if (key === 'carrier_count') return mode === 'haplotype'
  if (key === 'group_af') return showGroupAf
  return true
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
    background-color: #f5f5f5;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 1;
    &:hover {
      background-color: #eaeaea;
    }
  }

  tr:hover {
    background: #f0f7ff;
  }

  th.numeric,
  td.numeric {
    text-align: right;
  }

  td.tr-locus-identity {
    min-width: min(22rem, 75vw);
    max-width: 42rem;
    white-space: normal;
    overflow-wrap: anywhere;
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

const TrLocusIdentity = styled.span`
  display: grid;
  min-width: 0;
  max-width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75ch;
  white-space: normal;
  overflow-wrap: anywhere;
`

const TrLocusCopy = styled.span`
  display: block;
  min-width: 0;
  max-height: 1.2em;
  overflow: auto;
  line-height: 1.2;
  overflow-wrap: anywhere;
  scrollbar-width: thin;
`

const TrLocusMetadata = styled.span`
  color: #555;
  font-size: 0.9em;
  overflow-wrap: anywhere;
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

const formatTrLengthRange = (min: number | null | undefined, max: number | null | undefined) => {
  if (min == null || max == null) return '—'
  const signed = (value: number) => (value > 0 ? `+${value}` : String(value))
  return min === max ? `${signed(min)} bp` : `${signed(min)}..${signed(max)} bp`
}

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

// --- Helper ---

const isTrVariant = (v: { allele_type?: string }): boolean =>
  (v.allele_type || '').toLowerCase() === 'trv'

const sourceIdFromAltId = (variantId: string | undefined): string | undefined => {
  const match = variantId?.match(/^(.*)~[1-9][0-9]*$/)
  return match?.[1]
}

/** Canonical TRID plus cohort is the table-row identity. Source records stay
 * provenance beneath that row; legacy payloads fall back without merging overlaps. */
const getHaplotypeTrLocusKey = (v: any): string => {
  const scope = v.lr_cohort ? `cohort:${v.lr_cohort}:` : ''
  const locus = parseTrLocusId(v.tr_locus_id || v.tr_id || '')
  if (locus) return `${scope}locus:${locus.canonicalId}`
  const sourceId = v.source_variant_id || sourceIdFromAltId(v.variant_id)
  if (sourceId) return `${scope}source:${sourceId}`
  const chrom = String(v.chrom || '').replace(/^chr/i, '')
  const end = v.end ?? (v.pos + Math.max(v.ref?.length || 1, 1) - 1)
  return `${scope}coordinates:${chrom}:${v.pos}:${end}`
}

const getTrLocusId = (v: any): string | null =>
  parseTrLocusId(v.tr_locus_id || v.tr_id || '')?.canonicalId || null

const getTrLocusDisplay = (v: DerivedVariant): TrLocusRowDisplay | null => {
  const locus = parseTrLocusId(v.tr_locus_id || v.tr_id || '')
  if (!locus) return null
  return getTrLocusRowDisplay({
    locus,
    presentation: v.tr_locus_presentation,
    bounds: v.tr_locus_bounds,
    componentSummary: v.tr_locus_component_summary,
    reviewedPrimaryLabel: v.gnomad_str,
  })
}

const getTrLocusDisplayLabel = (v: DerivedVariant): string =>
  getTrLocusDisplay(v)?.label || formatLongReadVariantId(v.source_variant_id || v.variant_id)

const exactSharedTrValue = <T,>(values: Array<T | null | undefined>): T | null => {
  if (!values.length || values.some((value) => value == null)) return null
  const serialized = new Set(values.map((value) => JSON.stringify(value)))
  return serialized.size === 1 ? values[0]! : null
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

type CompleteTrBounds = {
  min: number | null
  max: number | null
  unavailableReason: string | null
}

const getCompleteTrBounds = (alleles: any[]): CompleteTrBounds => {
  const bySource = new Map<string, any[]>()
  const missingSource = alleles.some(
    (allele) => !(allele.source_variant_id || sourceIdFromAltId(allele.variant_id))
  )
  if (missingSource) {
    return { min: null, max: null, unavailableReason: 'Source ALT identity is incomplete.' }
  }
  alleles.forEach((allele) => {
    const source = allele.source_variant_id || sourceIdFromAltId(allele.variant_id)
    bySource.set(source, [...(bySource.get(source) || []), allele])
  })

  const hasIncompleteSource = Array.from(bySource.values()).some((sourceAlleles) => {
    const counts = new Set(sourceAlleles.map((allele) => allele.alt_count))
    const count = counts.size === 1 ? sourceAlleles[0].alt_count : null
    const indices = sourceAlleles.map((allele) => allele.alt_index)
    return (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      sourceAlleles.length !== count ||
      new Set(indices).size !== count ||
      indices.some((index) => !Number.isSafeInteger(index) || index < 1 || index > count)
    )
  })
  if (hasIncompleteSource) {
    return {
      min: null,
      max: null,
      unavailableReason: 'Complete unique ALT indices are unavailable for every source record.',
    }
  }

  const deltas = alleles.map((allele) => {
    const sequenceDelta =
      typeof allele.alt === 'string' &&
      typeof allele.ref === 'string' &&
      !/^<.*>$/.test(allele.alt)
        ? allele.alt.length - allele.ref.length
        : null
    const declaredDelta = allele.allele_length ?? allele.length
    if (
      (!Number.isFinite(declaredDelta) && !Number.isFinite(sequenceDelta)) ||
      (Number.isFinite(declaredDelta) && sequenceDelta !== null && declaredDelta !== sequenceDelta)
    ) {
      return null
    }
    return Number.isFinite(declaredDelta) ? declaredDelta : sequenceDelta
  })
  if (deltas.some((delta) => delta === null)) {
    return {
      min: null,
      max: null,
      unavailableReason: 'A complete finite total allele length change (ALT − REF, bp) is unavailable.',
    }
  }
  if (!deltas.length) {
    return { min: null, max: null, unavailableReason: 'No exact ALT records are available.' }
  }
  return {
    min: Math.min(...(deltas as number[])),
    max: Math.max(...(deltas as number[])),
    unavailableReason: null,
  }
}

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
  mode: 'summary' | 'haplotype'
  showGroupAf: boolean
  showGroupCount: boolean
  totalGroups: number
  totalClusters: number
  totalSamples: number
  isClusteredView: boolean
  highlightedPosition: number | null
  lrCohort: LongReadCohort
  selectedColumns: LongReadVariantTableColumnKey[]
  onHoverVariant?: (position: number | null) => void
  onRowClick?: (pos: number) => void
}

const Dash = ({ title }: { title: string }) => (
  <span style={{ color: '#777' }} title={title}>—</span>
)

const TableRow = React.memo(function TableRow({
  v,
  mode,
  showGroupAf,
  showGroupCount,
  totalGroups,
  totalClusters,
  totalSamples,
  isClusteredView,
  highlightedPosition,
  lrCohort,
  selectedColumns,
  onHoverVariant,
  onRowClick,
}: TableRowProps) {
  const visibleColumns = selectedColumns.filter((key) =>
    columnIsApplicable(key, mode, showGroupAf, showGroupCount)
  )
  const identity = formatLongReadAlleleDisplay(v)
  const unavailable = 'Exact-allele data is unavailable for a tandem-repeat locus row.'
  const locusId = getTrLocusId(v)
  const locusDisplay = v.is_tr ? getTrLocusDisplay(v) : null

  return (
    <tr
      data-position={v.pos}
      onMouseEnter={() => onHoverVariant?.(v.pos)}
      onMouseLeave={() => onHoverVariant?.(null)}
      style={{
        cursor: 'pointer',
        background: highlightedPosition === v.pos ? '#fff3cd' : undefined,
        transition: 'background 0.3s ease',
      }}
      onClick={() => onRowClick?.(v.pos)}
    >
      <td
        className={v.is_tr ? 'tr-locus-identity' : undefined}
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
      >
        {v.is_tr && locusId && locusDisplay ? (
          <TrLocusIdentity>
            <TrLocusCopy
              aria-label="Scrollable locus label, interval, and component summary"
              role="region"
              tabIndex={0}
            >
              <span>{locusDisplay.label}</span>{' '}
              <TrLocusMetadata>
                {locusDisplay.intervalLabel} · {locusDisplay.summaryLabel}
              </TrLocusMetadata>
            </TrLocusCopy>
            <Link
              to={trLocusUrl(locusId, v.lr_cohort || lrCohort)}
              preserveSelectedDataset={false}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              title={locusDisplay.detailsAccessibleLabel}
              aria-label={locusDisplay.detailsAccessibleLabel}
            >
              Details
            </Link>
          </TrLocusIdentity>
        ) : (
          <Link
            to={longReadVariantUrl(v.variant_id, v.lr_cohort || lrCohort)}
            preserveSelectedDataset={false}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            title={identity.accessibleLabel}
          >
            {identity.compactLabel}
          </Link>
        )}
        {!v.is_tr && identity.alleleLabel && (
          <span style={{ marginLeft: 4 }} title={identity.label}>
            <Badge level="info">{identity.alleleLabel.replace('Allele ', 'ALT ')}</Badge>
          </span>
        )}
      </td>
      {visibleColumns.map((columnKey) => {
        switch (columnKey) {
          case 'source_variant_id':
            return (
              <td
                key={columnKey}
                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                title={
                  v.is_tr
                    ? 'Source records are listed on the locus page; no representative record is promoted.'
                    : v.source_variant_id || 'Source VCF ID unavailable'
                }
              >
                {v.is_tr ? (
                  <Dash title="Source records are listed on the locus page; no representative record is promoted." />
                ) : v.source_variant_id ? (
                  v.source_variant_id
                ) : (
                  <span style={{ color: '#666' }}>Unavailable</span>
                )}
              </td>
            )
          case 'allele_type':
            return <td key={columnKey}><TypeDot $color={getAlleleTypeColor(v.allele_type)} />{v.is_tr ? 'TR' : v.allele_type}</td>
          case 'allele_length':
            return <td key={columnKey} className="numeric"><span title={v.delta_unavailable_reason || 'Complete total allele length change (ALT − REF, bp) range'}>{v.is_tr ? formatTrLengthRange(v.min_length_diff, v.max_length_diff) : v.allele_length}</span></td>
          case 'lr_af':
            return <td key={columnKey} className="numeric">{v.is_tr ? <Dash title={unavailable} /> : formatLongReadFrequency(v.freq.af, 4)}</td>
          case 'ac':
            return <td key={columnKey} className="numeric">{v.is_tr ? <Dash title={unavailable} /> : formatLongReadFrequency(v.freq.ac)}</td>
          case 'an':
            return <td key={columnKey} className="numeric">{v.is_tr ? <Dash title={unavailable} /> : formatLongReadFrequency(v.freq.an)}</td>
          case 'group_count':
            return <td key={columnKey} className="numeric">{isClusteredView ? <>{v.active_cluster_count ?? 0} / {totalClusters}</> : <>{v.group_count} / {totalGroups}</>}</td>
          case 'carrier_count':
            return <td key={columnKey} className="numeric">{v.carrier_count == null ? <Dash title="Complete carrier membership is unavailable." /> : <>{v.carrier_count} / {totalSamples}</>}</td>
          case 'group_af':
            return <td key={columnKey}>{v.is_tr ? <Dash title={unavailable} /> : <PopAfBar variant={v} />}</td>
          case 'short_read_match_id':
            return <td key={columnKey}>{v.is_tr ? <Dash title={unavailable} /> : v.short_read_match_id ? <Link to={`/variant/${v.short_read_match_id}?dataset=gnomad_r4`} preserveSelectedDataset={false}>{v.short_read_match_id}</Link> : <Dash title="No short-read match" />}</td>
          case 'cadd_phred':
            return <td key={columnKey} className="numeric">{v.is_tr ? <Dash title={unavailable} /> : renderPredictor(v.cadd_phred, 25.3, 28.1)}</td>
          case 'phylop':
            return <td key={columnKey} className="numeric">{v.is_tr ? <Dash title={unavailable} /> : renderPredictor(v.phylop, 7.367, 9.741)}</td>
          case 'major_consequence':
            return <td key={columnKey}>{v.is_tr ? <Dash title={unavailable} /> : v.major_consequence ? getLabelForConsequenceTerm(v.major_consequence) : <Dash title="Consequence unavailable" />}</td>
          case 'rsid':
            return <td key={columnKey}>{v.is_tr ? <Dash title={unavailable} /> : v.rsid?.startsWith('rs') ? <a href={`https://www.ncbi.nlm.nih.gov/snp/${v.rsid}`} target="_blank" rel="noopener noreferrer">{v.rsid}</a> : v.dbsnp_id || <Dash title="rsID unavailable" />}</td>
          default:
            return null
        }
      })}
    </tr>
  )
})

// --- Main component ---

export type VariantTypeFilters = LongReadVariantTypeFilters

type HaplotypeVariantTableProps = {
  mode?: 'summary' | 'haplotype'
  lrCohort?: 'hgsvc_hprc' | 'aou'
  summaryVariants?: any[]
  haplotypeGroups?: { groups: HaplotypeGroup[]; clusters?: HaplotypeCluster[] }
  sampleMetadata?: unknown
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
const HaplotypeVariantTable = forwardRef<HaplotypeVariantTableHandle, HaplotypeVariantTableProps>(function HaplotypeVariantTable({
  mode = 'haplotype',
  lrCohort = 'hgsvc_hprc',
  summaryVariants = EMPTY_VARIANTS,
  haplotypeGroups = EMPTY_HAPLOTYPE_GROUPS,
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
  const [selectedColumns, setSelectedColumns] = useState<LongReadVariantTableColumnKey[]>(getInitialLongReadVariantTableColumns)
  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
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
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null)
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          // Flash highlight
          if (highlightTimeout.current) clearTimeout(highlightTimeout.current)
          setHighlightedPosition(rowPos)
          highlightTimeout.current = setTimeout(() => setHighlightedPosition(null), 2000)
          return
        }
      }
    },
  }), [])

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
      const bounds = isTr ? getCompleteTrBounds(alleles) : null
      const locusId = isTr ? getTrLocusId(v) : null
      const SUPERPOPS = new Set(['afr', 'amr', 'eas', 'nfe', 'sas'])
      const populations = isTr
        ? []
        : (v.freq?.populations || [])
            .filter((p: any) => SUPERPOPS.has(p.id) && p.af != null)
            .map((p: any) => ({ id: p.id, af: p.af, ac: p.ac ?? null }))

      return [{
        variant_id: isTr && locusId ? `lr-tr-locus:${v.lr_cohort || lrCohort}:${locusId}` : v.variant_id,
        source_variant_id: isTr ? null : v.source_variant_id,
        alt_index: isTr ? null : v.alt_index,
        alt_count: isTr ? null : v.alt_count,
        lr_cohort: v.lr_cohort,
        chrom: v.chrom,
        pos: v.pos,
        end: v.end || null,
        ref: isTr ? '' : v.ref,
        alt: isTr ? '' : v.alt,
        allele_type: v.allele_type,
        allele_length: isTr ? (bounds?.max ?? 0) : v.allele_length ?? v.length ?? 0,
        freq: isTr
          ? nullableLongReadFrequency({ af: null, ac: null, an: null })
          : nullableLongReadFrequency(v.freq?.all || {}),
        populations,
        rsid: isTr ? '' : (v.rsids || [])[0] || '',
        major_consequence: isTr ? null : v.major_consequence || null,
        cadd_phred: isTr ? null : v.cadd_phred ?? null,
        phylop: isTr ? null : v.phylop ?? null,
        sv_consequences: isTr ? null : v.sv_consequences || null,
        dbsnp_id: null,
        tr_id: locusId,
        tr_locus_id: locusId,
        tr_locus_presentation: v.tr_locus_presentation ?? null,
        tr_locus_bounds: v.tr_locus_bounds ?? null,
        tr_locus_component_summary: v.tr_locus_component_summary ?? null,
        tr_motifs: isTr ? parseTrLocusId(locusId || '')?.components.map((component) => component.motif).join(',') || null : null,
        gnomad_str: v.gnomad_str ?? null,
        allele_methylation: null,
        motif_counts: null,
        allele_purity: null,
        group_count: 0,
        carrier_count: isTr ? null : v.freq?.all?.ac ?? null,
        short_read_match_id: isTr ? null : v.short_read_match_id || null,
        is_tr: isTr,
        min_length_diff: bounds?.min ?? null,
        max_length_diff: bounds?.max ?? null,
        delta_unavailable_reason: bounds?.unavailableReason ?? null,
        enveloped_ids: null,
        search_identifiers: Array.from(new Set(alleles.flatMap((allele) => [
          locusId,
          allele.variant_id,
          allele.source_variant_id,
          allele.gnomad_str,
          ...(allele.rsids || []),
        ].filter(Boolean)))),
      } as DerivedVariant]
    })
  }, [mode, summaryVariants, lrCohort])

  // Derive unique variant list for haplotype mode, grouping TRVs by position.
  // This is expensive (~8s for large regions) and must NOT depend on summaryVariants
  // (which changes on zoom). Only haplotypeGroups should trigger recomputation.
  const haplotypeDerivedVariants = useMemo(() => {
    if (mode !== 'haplotype') return []
    console.time('[perf] HaplotypeVariantTable derive variants')

    // Phase 1: collect all variant occurrences with carrier info
    const map = new Map<
      string,
      {
        variant: any
        groupCount: number
        carrierIds: Set<string>
        exactAlleles: Map<string, any>
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
          exactAlleles: new Map(),
          searchIdentifiers: new Set(),
        }
        map.set(key, entry)
      }
      ;[
        getTrLocusId(v),
        v.variant_id,
        v.source_variant_id,
        v.short_read_match_id,
        v.gnomad_str,
        v.tr_id,
        ...(v.rsids || []),
        v.rsid,
      ].filter(Boolean).forEach((identifier) => entry!.searchIdentifiers.add(String(identifier)))
      if (isTrVariant(v)) {
        const source = v.source_variant_id || sourceIdFromAltId(v.variant_id)
        const exactKey = source && Number.isSafeInteger(v.alt_index)
          ? `${source}~${v.alt_index}`
          : v.variant_id
        if (exactKey && !entry.exactAlleles.has(exactKey)) entry.exactAlleles.set(exactKey, v)
      }
      return { key, entry }
    }

    const recordCarrier = (v: any, sampleId: string) => {
      const { entry } = ensureEntry(v)
      entry.carrierIds.add(sampleId)
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
          ;(sample.haplotypeA?.variants || dg.haplotypeA?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id))
          ;(sample.haplotypeB?.variants || dg.haplotypeB?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id))
          ;(sample.below_thresholdA?.variants || dg.below_thresholdA?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id))
          ;(sample.below_thresholdB?.variants || dg.below_thresholdB?.variants || []).forEach((v: any) => recordCarrier(v, sample.sample_id))
        }
      } else {
        // Above-threshold sample variant_sets contain the carrier-specific TR
        // ALT substituted by inflateGroups; group.variants only has a representative ALT.
        for (const sample of group.samples) {
          const sampleVariants = sample.variant_sets?.flatMap((set: any) => set.variants || []) || group.variants.variants
          sampleVariants.forEach((v: any) => recordCarrier(v, sample.sample_id))
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
    for (const [key, { variant: v, groupCount, carrierIds, exactAlleles, searchIdentifiers }] of map) {
      const isTrv = isTrVariant(v)
      const locusId = isTrv ? getTrLocusId(v) : null
      const bounds = isTrv ? getCompleteTrBounds(Array.from(exactAlleles.values())) : null
      const variantId = isTrv && locusId
        ? `lr-tr-locus:${v.lr_cohort || lrCohort}:${locusId}`
        : v.variant_id || buildVariantId(v)

      result.push({
        // LRVariant base fields
        variant_id: variantId,
        source_variant_id:
          isTrv && locusId
            ? null
            : v.source_variant_id || (isTrv ? sourceIdFromAltId(v.variant_id) : undefined),
        alt_index: isTrv ? null : v.alt_index,
        alt_count: isTrv ? null : v.alt_count,
        lr_cohort: v.lr_cohort,
        chrom: v.chrom,
        pos: v.pos,
        end: v.end ?? null,
        ref: isTrv ? '' : v.ref,
        alt: isTrv ? '' : v.alt,
        allele_type: isTrv ? 'trv' : v.allele_type || 'snv',
        allele_length: isTrv ? (bounds?.max ?? 0) : v.allele_length || 0,
        freq: isTrv
          ? nullableLongReadFrequency({ af: null, ac: null, an: null })
          : v.freq,
        populations: isTrv ? [] : v.populations || [],
        rsid: isTrv ? '' : v.rsid || '',
        major_consequence: isTrv ? null : v.major_consequence ?? null,
        cadd_phred: isTrv ? null : v.cadd_phred ?? null,
        phylop: isTrv ? null : v.phylop ?? null,
        sv_consequences: isTrv ? null : v.sv_consequences ?? null,
        dbsnp_id: isTrv ? null : v.dbsnp_id ?? null,
        tr_id: locusId,
        tr_locus_id: locusId,
        tr_locus_presentation: v.tr_locus_presentation ?? null,
        tr_locus_bounds: v.tr_locus_bounds ?? null,
        tr_locus_component_summary: v.tr_locus_component_summary ?? null,
        tr_motifs: v.tr_motifs ?? null,
        gnomad_str: v.gnomad_str ?? null,
        allele_methylation: v.allele_methylation ?? null,
        motif_counts: v.motif_counts ?? null,
        allele_purity: v.allele_purity ?? null,
        // DerivedVariant extensions
        group_count: groupCount,
        carrier_count: carrierIds.size,
        is_tr: isTrv,
        min_length_diff: bounds?.min ?? null,
        max_length_diff: bounds?.max ?? null,
        delta_unavailable_reason: bounds?.unavailableReason ?? null,
        short_read_match_id: isTrv ? null : v.short_read_match_id || null,
        enveloped_ids: isTrv ? null : v.enveloped_ids || null,
        cluster_distribution: clusterDistByKey.get(key),
        active_cluster_count: getActiveClusterCount(clusterDistByKey.get(key)),
        search_identifiers: Array.from(searchIdentifiers),
      })
    }

    console.log(`[perf] HaplotypeVariantTable: ${result.length} derived variants (${result.filter(v => v.is_tr).length} TR)`)
    console.timeEnd('[perf] HaplotypeVariantTable derive variants')
    return result
  }, [mode, haplotypeGroups, lrCohort])

  const trContractsByLocus = useMemo(() => {
    const rowsByLocus = new Map<string, any[]>()
    summaryVariants.forEach((variant) => {
      const locusId = getTrLocusId(variant)
      if (locusId) rowsByLocus.set(locusId, [...(rowsByLocus.get(locusId) || []), variant])
    })
    return new Map(
      Array.from(rowsByLocus.entries()).map(([locusId, variantsAtLocus]) => [
        locusId,
        {
          tr_locus_presentation: exactSharedTrValue(
            variantsAtLocus.map((variant) => variant.tr_locus_presentation)
          ),
          tr_locus_bounds: exactSharedTrValue(
            variantsAtLocus.map((variant) => variant.tr_locus_bounds)
          ),
          tr_locus_component_summary: exactSharedTrValue(
            variantsAtLocus.map((variant) => variant.tr_locus_component_summary)
          ),
          gnomad_str: exactSharedTrValue(
            variantsAtLocus.map((variant) => variant.gnomad_str)
          ),
        },
      ])
    )
  }, [summaryVariants])

  // REST haplotype payloads intentionally stay compact. Join the already-loaded
  // GraphQL row contracts after the expensive grouping derivation, so viewport
  // changes do not force that derivation to run again.
  const variants = useMemo(() => {
    if (mode === 'summary') return summaryDerivedVariants
    return haplotypeDerivedVariants.map((variant) => {
      const locusId = getTrLocusId(variant)
      const contracts = locusId ? trContractsByLocus.get(locusId) : null
      return contracts ? { ...variant, ...contracts } : variant
    })
  }, [mode, summaryDerivedVariants, haplotypeDerivedVariants, trContractsByLocus])

  const totalGroups = haplotypeGroups.groups.length
  const totalClusters = haplotypeGroups.clusters?.length ?? 0
  const isDiploidView =
    mode === 'haplotype' &&
    haplotypeGroups.groups.length > 0 &&
    'is_diplotype' in haplotypeGroups.groups[0]
  const showGroupCount = mode === 'haplotype' && !isDiploidView
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
    const countHeaders = mode === 'haplotype'
      ? [
          ...(showGroupCount ? [isClusteredView ? 'clusters' : 'groups'] : []),
          'carriers',
        ]
      : []
    const headers = [
      'variant_id',
      'display_id',
      'source_variant_id',
      'alt_index',
      'alt_count',
      'chrom',
      'position',
      'ref',
      'alt',
      'type',
      'sv_type',
      'length',
      'lr_af',
      ...countHeaders,
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
    const rows = sorted.map((v) => {
      const locusId = v.is_tr ? getTrLocusId(v) : null
      return [
        locusId || v.variant_id,
        escapeField(v.is_tr ? getTrLocusDisplayLabel(v) : formatLongReadAlleleDisplay(v).label),
        v.is_tr ? '' : v.source_variant_id ?? '',
        v.is_tr ? '' : v.alt_index ?? '',
        v.is_tr ? '' : v.alt_count ?? '',
        v.chrom,
        v.pos,
        v.is_tr ? '' : escapeField(v.ref),
        v.is_tr ? '' : escapeField(v.alt),
        v.is_tr ? 'TR' : v.allele_type,
        v.is_tr ? 'TR' : getVariantCategory(v.allele_type, v.allele_length),
        v.is_tr ? formatTrLengthRange(v.min_length_diff, v.max_length_diff) : v.allele_length,
        v.is_tr ? '' : v.freq.af,
        ...(mode === 'haplotype'
          ? [
              ...(showGroupCount
                ? [
                    isClusteredView
                      ? `${v.active_cluster_count ?? 0}/${totalClusters}`
                      : `${v.group_count}/${totalGroups}`,
                  ]
                : []),
              v.carrier_count == null ? '' : `${v.carrier_count}/${totalSamples}`,
            ]
          : []),
        '',
        v.is_tr ? '' : v.rsid,
        v.is_tr ? '' : getPopAf(v, 'afr'),
        v.is_tr ? '' : getPopAf(v, 'amr'),
        v.is_tr ? '' : getPopAf(v, 'eas'),
        v.is_tr ? '' : getPopAf(v, 'nfe'),
        v.is_tr ? '' : getPopAf(v, 'sas'),
        v.is_tr ? '' : v.cadd_phred ?? '',
        v.is_tr ? '' : v.phylop ?? '',
        v.is_tr || !v.sv_consequences ? '' : escapeField(v.sv_consequences.join(';')),
        v.is_tr ? '' : v.dbsnp_id ?? '',
      ].join(',')
    })
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
        <Button onClick={() => setShowTableConfigurationModal(true)}>Configure table</Button>
        <CountLabel>
          Showing {sorted.length} of {variants.length} variants
        </CountLabel>
      </ControlBar>

      <div ref={tableScrollRef} onScroll={handleTableScroll} style={{ maxHeight, overflowY: 'auto', position: 'relative' }}>
        <StyledTable>
          <thead>
            <tr>
              <th onClick={() => handleSort('variant_id')}>Variant{sortIndicator('variant_id')}</th>
              {selectedColumns
                .filter((key) => columnIsApplicable(key, mode, !(mode === 'summary' && lrCohort === 'aou'), showGroupCount))
                .map((columnKey) => {
                  switch (columnKey) {
                    case 'source_variant_id':
                      return <th key={columnKey} onClick={() => handleSort('source_variant_id')}>Variant ID{sortIndicator('source_variant_id')}</th>
                    case 'allele_type':
                      return <th key={columnKey} onClick={() => handleSort('allele_type')}>Type{sortIndicator('allele_type')}</th>
                    case 'allele_length':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('allele_length')}>
                        Length{sortIndicator('allele_length')}
                        <HaplotypeHelpButton title="About Length">
                          <p style={{ marginTop: 0 }}>For ordinary SNVs, indels, and structural variants, Length is the signed or represented allele length used by this table.</p>
                          <p style={{ marginBottom: 0 }}>For tandem repeats (TRs), Length is the observed minimum-to-maximum signed allele length difference relative to the reference allele at the locus. For example, <strong>-13..0 bp</strong> means observed alleles range from 13 bp shorter than the reference to the reference length. Negative means shorter, zero means reference length, and positive means longer. This is ALT minus REF length, not the reference locus or base span.</p>
                        </HaplotypeHelpButton>
                      </th>
                    case 'lr_af':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('freq.af')}>LR AF{sortIndicator('freq.af')}</th>
                    case 'ac':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('freq.ac')}>AC{sortIndicator('freq.ac')}</th>
                    case 'an':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('freq.an')}>AN{sortIndicator('freq.an')}</th>
                    case 'group_count':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort(isClusteredView ? 'active_cluster_count' : 'group_count')}>
                        {isClusteredView ? 'Clusters' : 'Groups'}{sortIndicator(isClusteredView ? 'active_cluster_count' : 'group_count')}
                        <HaplotypeHelpButton title={`About ${isClusteredView ? 'Clusters' : 'Groups'} and Carriers`}><p style={{ margin: 0 }}><strong>Groups</strong> counts displayed haplotype patterns containing the variant; <strong>Clusters</strong> counts active clusters containing it. <strong>Carriers</strong> counts unique individuals containing the variant. The Groups/Clusters count is not an allele-copy or haplotype denominator.</p></HaplotypeHelpButton>
                      </th>
                    case 'carrier_count':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('carrier_count')}>Carriers{sortIndicator('carrier_count')}</th>
                    case 'group_af':
                      return <th key={columnKey}>Grp AF</th>
                    case 'short_read_match_id':
                      return mode === 'summary' ? <th key={columnKey} onClick={() => handleSort('short_read_match_id')}>SR Match ID{sortIndicator('short_read_match_id')}</th> : <th key={columnKey}>SR Match</th>
                    case 'cadd_phred':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('cadd_phred')} style={{ width: 60 }}>CADD{sortIndicator('cadd_phred')}</th>
                    case 'phylop':
                      return <th key={columnKey} className="numeric" onClick={() => handleSort('phylop')} style={{ width: 60 }}>phyloP{sortIndicator('phylop')}</th>
                    case 'major_consequence':
                      return <th key={columnKey} onClick={() => handleSort('major_consequence')}>Consequence{sortIndicator('major_consequence')}</th>
                    case 'rsid':
                      return <th key={columnKey} onClick={() => handleSort('rsid')}>rsID{sortIndicator('rsid')}</th>
                    default:
                      return null
                  }
                })}
            </tr>
          </thead>
          <tbody>
            {(() => {
              // Skip virtualization when the row count is small enough to render all
              // (for example, after filtering to fixed-height TR locus rows).
              const VIRTUALIZE_THRESHOLD = 200
              const shouldVirtualize = sorted.length >= VIRTUALIZE_THRESHOLD

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
                    return (
                      <TableRow
                        key={`${v.pos}-${v.variant_id}-${i}`}
                        v={v}
                        mode={mode}
                        showGroupAf={!(mode === 'summary' && lrCohort === 'aou')}
                        showGroupCount={showGroupCount}
                        totalGroups={totalGroups}
                        totalClusters={totalClusters}
                        totalSamples={totalSamples}
                        isClusteredView={isClusteredView}
                        highlightedPosition={highlightedPosition}
                        lrCohort={lrCohort}
                        selectedColumns={selectedColumns}
                        onHoverVariant={onHoverVariant}
                        onRowClick={onRowClick}
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

      {showTableConfigurationModal && (
        <VariantTableConfigurationModal
          availableColumns={[...LONG_READ_VARIANT_TABLE_COLUMNS]}
          context={{}}
          defaultColumns={DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS}
          selectedColumns={selectedColumns}
          onCancel={() => setShowTableConfigurationModal(false)}
          onSave={(newSelectedColumns: string[]) => {
            const validColumns = newSelectedColumns.filter((key): key is LongReadVariantTableColumnKey =>
              VALID_LONG_READ_VARIANT_TABLE_COLUMNS.has(key as LongReadVariantTableColumnKey)
            )
            setSelectedColumns(validColumns)
            setShowTableConfigurationModal(false)
            userPreferences.savePreference(LONG_READ_VARIANT_TABLE_PREFERENCE, validColumns).then(null, (error: Error) => {
              showNotification({ title: 'Error', message: error.message, status: 'error' })
            })
          }}
        />
      )}
    </TableContainer>
  )
})

export default React.memo(HaplotypeVariantTable)




