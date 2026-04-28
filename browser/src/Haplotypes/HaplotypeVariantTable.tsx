import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { SUPERPOPULATION_COLORS, VARIANT_TYPE_COLORS } from './colors'
import type { HaplotypeGroup } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type StrDataPoint = { length_diff: number; pop: string; count: number }

type DerivedVariant = {
  variant_id: string
  position: number
  chrom: string
  ref: string
  alt: string
  allele_type: string
  allele_length: number
  info_AF: number
  info_SVTYPE: string | null
  info_SVLEN: number
  rsid: string
  gnomad_v4_match_type: string | null
  info_AF_afr: number | null
  info_AF_amr: number | null
  info_AF_eas: number | null
  info_AF_nfe: number | null
  info_AF_sas: number | null
  group_count: number
  carrier_count: number
  is_str: boolean
  str_distribution?: StrDataPoint[]
  min_length_diff?: number
  max_length_diff?: number
  cadd_phred: number | null
  phylop: number | null
  sv_consequences: string[] | null
  dbgap_id: string | null
  tr_id: string | null
  tr_motifs: string | null
  tr_struc: string | null
  allele_methylation: number | null
  motif_counts: string | null
  allele_purity: number | null
}

type SortConfig = {
  key: keyof DerivedVariant
  direction: 'asc' | 'desc'
}

// --- Styled components ---

const TableContainer = styled.div`
  font-size: 13px;
  overflow-x: auto;
`

const ControlBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
  padding: 6px 0;
`

const FilterButton = styled.button<{ $active: boolean; $color: string }>`
  padding: 3px 10px;
  font-size: 12px;
  border: 1px solid ${(p) => (p.$active ? p.$color : '#ccc')};
  border-radius: 3px;
  background: ${(p) => (p.$active ? p.$color : '#f8f8f8')};
  color: ${(p) => (p.$active ? 'white' : '#333')};
  cursor: pointer;
  &:hover {
    opacity: 0.85;
  }
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

const StrExpandedRow = styled.tr`
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
  if (value == null) return <span style={{ color: '#999' }}>—</span>
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

// --- Mini STR Distribution Plot ---

const PLOT_WIDTH = 300
const PLOT_HEIGHT = 80
const PLOT_MARGIN = { top: 8, right: 8, bottom: 20, left: 32 }

const POP_ORDER = ['AFR', 'AMR', 'EAS', 'EUR', 'SAS', 'N/A']

const MiniSTRPlot = ({ distribution }: { distribution: StrDataPoint[] }) => {
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

  const innerWidth = PLOT_WIDTH - PLOT_MARGIN.left - PLOT_MARGIN.right
  const innerHeight = PLOT_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom

  const maxTotal = Math.max(...byLength.map((d) => d.total), 1)
  const barWidth = Math.max(4, Math.min(20, innerWidth / byLength.length - 2))

  const xScale = (i: number) =>
    PLOT_MARGIN.left + (innerWidth / byLength.length) * i + (innerWidth / byLength.length - barWidth) / 2
  const yScale = (val: number) => PLOT_MARGIN.top + innerHeight * (1 - val / maxTotal)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={PLOT_WIDTH} height={PLOT_HEIGHT}>
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
          x2={PLOT_WIDTH - PLOT_MARGIN.right}
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
              {/* X tick label */}
              <text
                x={bx + barWidth / 2}
                y={PLOT_MARGIN.top + innerHeight + 12}
                fontSize={7}
                textAnchor="middle"
                fill="#666"
              >
                {d.lengthDiff > 0 ? `+${d.lengthDiff}` : d.lengthDiff}
              </text>
            </g>
          )
        })}

        {/* X axis label */}
        <text
          x={PLOT_MARGIN.left + innerWidth / 2}
          y={PLOT_HEIGHT - 2}
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
  const pops = [
    { key: 'AFR', value: variant.info_AF_afr },
    { key: 'AMR', value: variant.info_AF_amr },
    { key: 'EAS', value: variant.info_AF_eas },
    { key: 'EUR', value: variant.info_AF_nfe },
    { key: 'SAS', value: variant.info_AF_sas },
  ].filter((p) => p.value != null) as { key: string; value: number }[]

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

const isStrVariant = (v: { allele_type?: string; info_SVTYPE?: string | null }): boolean =>
  v.allele_type === 'trv' || v.info_SVTYPE === 'TRV'

const getVariantTypeCategory = (allele_type: string): 'snv' | 'indel' | 'sv' | 'str' => {
  if (allele_type === 'snv') return 'snv'
  if (['del', 'ins'].includes(allele_type)) return 'indel'
  if (allele_type === 'trv') return 'str'
  return 'sv'
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
 *  - True SVs (symbolic alleles like <DEL>, or either allele >20bp): chrom-pos-SVTYPE(length)
 *
 *  info_SVTYPE is NOT used as the trigger because the LR VCF sets it even for
 *  simple 1bp indels (e.g. info_SVTYPE="DEL" for a 7bp→1bp deletion). */
const buildVariantId = (v: {
  chrom: string
  position: number
  alleles: string[]
  info_SVTYPE?: string | null
  info_SVLEN?: number
  allele_type?: string
}): string => {
  const ref = v.alleles[0]
  const alt = v.alleles[1]
  const isSymbolic = alt.startsWith('<') && alt.endsWith('>')
  const isLongAllele = ref.length > 20 || alt.length > 20

  if (isSymbolic || isLongAllele) {
    const svtype = v.info_SVTYPE || v.allele_type || 'SV'
    const len = v.info_SVLEN ? Math.abs(v.info_SVLEN) : Math.abs(alt.length - ref.length)
    return `${v.chrom}-${v.position}-${svtype.toUpperCase()}(${len})`
  }

  return `${v.chrom}-${v.position}-${ref}-${alt}`
}

// --- Main component ---

type HaplotypeVariantTableProps = {
  haplotypeGroups: { groups: HaplotypeGroup[] }
  sampleMetadata: SampleMetadataMap
  totalGroups?: number
  onHoverVariant?: (position: number | null) => void
}

const HaplotypeVariantTable = ({
  haplotypeGroups,
  sampleMetadata,
  onHoverVariant,
}: HaplotypeVariantTableProps) => {
  const [sort, setSort] = useState<SortConfig>({ key: 'position', direction: 'asc' })
  const [searchText, setSearchText] = useState('')
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    snv: true,
    indel: true,
    sv: true,
    str: true,
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Derive unique variant list, grouping TRVs by position
  const variants = useMemo(() => {
    // Phase 1: collect all variant occurrences with carrier info
    const map = new Map<
      string,
      {
        variant: any
        groupCount: number
        carrierIds: Set<string>
        // For STR loci: accumulate per-carrier length diffs by pop
        strCarriers?: Map<string, { lengthDiff: number; pop: string }[]>
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
        const isTrv = isStrVariant(v)
        // STR variants group by chrom:pos:TRV; others by pos:ref:alt
        const key = isTrv
          ? `${v.chrom}:${v.position}:TRV`
          : `${v.position}:${v.alleles[0]}:${v.alleles[1]}`
        if (seen.has(key)) continue
        seen.add(key)

        let entry = map.get(key)
        if (!entry) {
          entry = {
            variant: v,
            groupCount: 0,
            carrierIds: new Set(),
            ...(isTrv ? { strCarriers: new Map() } : {}),
          }
          map.set(key, entry)
        }
        entry.groupCount++

        for (const s of group.samples) {
          entry.carrierIds.add(s.sample_id)

          // Accumulate STR length diff per carrier
          if (isTrv && entry.strCarriers) {
            const meta = sampleMetadata.get(s.sample_id)
            const pop = meta?.superpopulation || 'N/A'
            const lengthDiff = v.alleles[1].length - v.alleles[0].length
            const carrierId = s.sample_id
            if (!entry.strCarriers.has(carrierId)) {
              entry.strCarriers.set(carrierId, [])
            }
            entry.strCarriers.get(carrierId)!.push({ lengthDiff, pop })
          }
        }
      }
    }

    // Phase 2: build DerivedVariant array
    const result: DerivedVariant[] = []
    for (const [key, { variant: v, groupCount, carrierIds, strCarriers }] of map) {
      const isTrv = key.endsWith(':TRV')

      // Build STR distribution from accumulated carrier data
      let strDistribution: StrDataPoint[] | undefined
      let minLengthDiff: number | undefined
      let maxLengthDiff: number | undefined

      if (isTrv && strCarriers && strCarriers.size > 0) {
        const distMap = new Map<string, number>() // "lengthDiff:pop" -> count
        for (const [, entries] of strCarriers) {
          for (const { lengthDiff, pop } of entries) {
            const dkey = `${lengthDiff}:${pop}`
            distMap.set(dkey, (distMap.get(dkey) || 0) + 1)
          }
        }
        strDistribution = []
        const allLengths: number[] = []
        for (const [dkey, count] of distMap) {
          const [ld, pop] = dkey.split(':')
          const lengthDiff = parseInt(ld, 10)
          strDistribution.push({ length_diff: lengthDiff, pop, count })
          allLengths.push(lengthDiff)
        }
        if (allLengths.length > 0) {
          minLengthDiff = Math.min(...allLengths)
          maxLengthDiff = Math.max(...allLengths)
        }
      }

      const variantId = isTrv
        ? `${v.chrom}-${v.position}-STR`
        : buildVariantId(v)

      result.push({
        variant_id: variantId,
        position: v.position,
        chrom: v.chrom,
        ref: v.alleles[0],
        alt: isTrv ? `STR(${minLengthDiff ?? 0}..${maxLengthDiff ?? 0}bp)` : v.alleles[1],
        allele_type: isTrv ? 'trv' : v.allele_type || 'snv',
        allele_length: isTrv
          ? (maxLengthDiff ?? 0) - (minLengthDiff ?? 0)
          : v.allele_length || 0,
        info_AF: Array.isArray(v.info_AF) ? v.info_AF[0] : v.info_AF || 0,
        info_SVTYPE: v.info_SVTYPE || null,
        info_SVLEN: v.info_SVLEN || 0,
        rsid: v.rsid || '',
        gnomad_v4_match_type: v.gnomad_v4_match_type || null,
        info_AF_afr: v.info_AF_afr ?? null,
        info_AF_amr: v.info_AF_amr ?? null,
        info_AF_eas: v.info_AF_eas ?? null,
        info_AF_nfe: v.info_AF_nfe ?? null,
        info_AF_sas: v.info_AF_sas ?? null,
        group_count: groupCount,
        carrier_count: carrierIds.size,
        is_str: isTrv,
        str_distribution: strDistribution,
        min_length_diff: minLengthDiff,
        max_length_diff: maxLengthDiff,
        cadd_phred: v.cadd_phred ?? null,
        phylop: v.phylop ?? null,
        sv_consequences: v.sv_consequences ?? null,
        dbgap_id: v.dbgap_id ?? null,
        tr_id: v.tr_id ?? null,
        tr_motifs: v.tr_motifs ?? null,
        tr_struc: v.tr_struc ?? null,
        allele_methylation: v.allele_methylation ?? null,
        motif_counts: v.motif_counts ?? null,
        allele_purity: v.allele_purity ?? null,
      })
    }

    return result
  }, [haplotypeGroups, sampleMetadata])

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
    list = list.filter((v) => typeFilters[getVariantTypeCategory(v.allele_type)])

    // Search filter
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(
        (v) =>
          v.variant_id.toLowerCase().includes(q) ||
          String(v.position).includes(q) ||
          v.rsid.toLowerCase().includes(q) ||
          v.ref.toLowerCase().includes(q) ||
          v.alt.toLowerCase().includes(q)
      )
    }

    return list
  }, [variants, typeFilters, searchText])

  // Sort
  const sorted = useMemo(() => {
    const { key, direction } = sort
    const multiplier = direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * multiplier
      return ((av as number) - (bv as number)) * multiplier
    })
  }, [filtered, sort])

  const handleSort = (key: keyof DerivedVariant) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    )
  }

  const sortIndicator = (key: keyof DerivedVariant) => {
    if (sort.key !== key) return ''
    return sort.direction === 'asc' ? ' ▲' : ' ▼'
  }

  const toggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }))
  }

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
    const rows = sorted.map((v) =>
      [
        v.variant_id,
        v.chrom,
        v.position,
        escapeField(v.ref),
        escapeField(v.alt),
        v.allele_type,
        v.info_SVTYPE || '',
        v.allele_length,
        v.info_AF,
        `${v.group_count}/${totalGroups}`,
        `${v.carrier_count}/${totalSamples}`,
        v.gnomad_v4_match_type || '',
        v.rsid,
        v.info_AF_afr ?? '',
        v.info_AF_amr ?? '',
        v.info_AF_eas ?? '',
        v.info_AF_nfe ?? '',
        v.info_AF_sas ?? '',
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

  const COL_COUNT = 12

  return (
    <TableContainer>
      <ControlBar>
        <FilterButton
          $active={typeFilters.snv}
          $color={VARIANT_TYPE_COLORS.snv}
          onClick={() => toggleTypeFilter('snv')}
        >
          SNV
        </FilterButton>
        <FilterButton
          $active={typeFilters.indel}
          $color="#43A047"
          onClick={() => toggleTypeFilter('indel')}
        >
          Indel
        </FilterButton>
        <FilterButton
          $active={typeFilters.sv}
          $color="#D73027"
          onClick={() => toggleTypeFilter('sv')}
        >
          SV
        </FilterButton>
        <FilterButton
          $active={typeFilters.str}
          $color={VARIANT_TYPE_COLORS.trv}
          onClick={() => toggleTypeFilter('str')}
        >
          STR
        </FilterButton>
        <SearchInput
          type="text"
          placeholder="Search position, rsID, allele…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <ExportButton onClick={exportCSV}>Export CSV</ExportButton>
        {sorted.some((v) => v.is_str) && (
          <>
            <ExportButton
              onClick={() =>
                setExpandedRows(new Set(sorted.filter((v) => v.is_str).map((v) => v.variant_id)))
              }
            >
              Expand all STR
            </ExportButton>
            <ExportButton onClick={() => setExpandedRows(new Set())}>Fold all STR</ExportButton>
          </>
        )}
        <CountLabel>
          Showing {sorted.length} of {variants.length} variants
        </CountLabel>
      </ControlBar>

      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <StyledTable>
          <thead>
            <tr>
              <th onClick={() => handleSort('variant_id')}>Variant ID{sortIndicator('variant_id')}</th>
              <th onClick={() => handleSort('allele_type')}>Type{sortIndicator('allele_type')}</th>
              <th onClick={() => handleSort('allele_length')}>
                Length{sortIndicator('allele_length')}
              </th>
              <th onClick={() => handleSort('info_AF')}>LR AF{sortIndicator('info_AF')}</th>
              <th onClick={() => handleSort('group_count')}>
                Groups{sortIndicator('group_count')}
              </th>
              <th onClick={() => handleSort('carrier_count')}>
                Carriers{sortIndicator('carrier_count')}
              </th>
              <th>Pop AF</th>
              <th onClick={() => handleSort('gnomad_v4_match_type')}>
                SR Match{sortIndicator('gnomad_v4_match_type')}
              </th>
              <th onClick={() => handleSort('cadd_phred')} style={{ width: 60 }}>
                CADD{sortIndicator('cadd_phred')}
              </th>
              <th onClick={() => handleSort('phylop')} style={{ width: 60 }}>
                phyloP{sortIndicator('phylop')}
              </th>
              <th>SV Csq</th>
              <th onClick={() => handleSort('rsid')}>rsID{sortIndicator('rsid')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => {
              const matchLevel = getMatchLevel(v.gnomad_v4_match_type)
              const isExpanded = v.is_str && expandedRows.has(v.variant_id)
              return (
                <React.Fragment key={`${v.position}-${v.variant_id}-${i}`}>
                  <tr
                    onMouseEnter={() => onHoverVariant?.(v.position)}
                    onMouseLeave={() => onHoverVariant?.(null)}
                    style={v.is_str ? { cursor: 'pointer', background: isExpanded ? '#fff8e1' : undefined } : undefined}
                    onClick={v.is_str ? () => toggleExpand(v.variant_id) : undefined}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {v.is_str && (
                        <ExpandToggle>{isExpanded ? '▼' : '▶'}</ExpandToggle>
                      )}
                      {v.variant_id}
                    </td>
                    <td>
                      <TypeDot $color={VARIANT_TYPE_COLORS[v.allele_type] || VARIANT_TYPE_COLORS.other} />
                      {v.is_str ? 'STR' : v.allele_type}
                    </td>
                    <td>
                      {v.is_str
                        ? `${v.min_length_diff ?? 0}..${v.max_length_diff ?? 0}bp`
                        : v.allele_length}
                    </td>
                    <td>{v.info_AF.toFixed(4)}</td>
                    <td>
                      {v.group_count} / {totalGroups}
                    </td>
                    <td>
                      {v.carrier_count} / {totalSamples}
                    </td>
                    <td>
                      <PopAfBar variant={v} />
                    </td>
                    <td>
                      <MatchBadge $level={matchLevel}>
                        {matchLevel === 'exact'
                          ? 'EXACT'
                          : matchLevel === 'truvari'
                            ? v.gnomad_v4_match_type
                            : '—'}
                      </MatchBadge>
                    </td>
                    <td>{renderPredictor(v.cadd_phred, 25.3, 28.1)}</td>
                    <td>{renderPredictor(v.phylop, 7.367, 9.741)}</td>
                    <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.sv_consequences && v.sv_consequences.length > 0
                        ? v.sv_consequences.map((csq, ci) => {
                            const { type, gene } = parseSvConsequence(csq)
                            return (
                              <SvCsqBadge key={ci} title={gene ? `${type}: ${gene}` : type}>
                                {type}{gene ? `:${gene}` : ''}
                              </SvCsqBadge>
                            )
                          })
                        : <span style={{ color: '#ccc' }}>—</span>
                      }
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
                  {isExpanded && v.str_distribution && (
                    <StrExpandedRow>
                      <td colSpan={COL_COUNT} style={{ padding: '8px 16px', background: '#fffde7' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                          <MiniSTRPlot distribution={v.str_distribution} />
                          <div style={{ fontSize: 11, color: '#555' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              STR Locus: {v.chrom}:{v.position}
                              {v.tr_id && <span style={{ fontWeight: 400, marginLeft: 8, color: '#888' }}>({v.tr_id})</span>}
                            </div>
                            <div>Allele length range: {v.min_length_diff ?? 0} to {v.max_length_diff ?? 0}bp</div>
                            <div>Total carriers: {v.carrier_count}</div>
                            <div>Distinct allele lengths: {new Set(v.str_distribution.map((d) => d.length_diff)).size}</div>
                            {v.tr_motifs && <div>Motifs: <span style={{ fontFamily: 'monospace' }}>{v.tr_motifs}</span></div>}
                            {v.tr_struc && <div>Structure: <span style={{ fontFamily: 'monospace' }}>{v.tr_struc}</span></div>}
                            {v.motif_counts && <div>Motif counts: <span style={{ fontFamily: 'monospace' }}>{v.motif_counts}</span></div>}
                            {v.allele_purity != null && <div>Allele purity: {v.allele_purity.toFixed(3)}</div>}
                            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {POP_ORDER.filter((p) => v.str_distribution!.some((d) => d.pop === p)).map((pop) => (
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
                          </div>
                        </div>
                      </td>
                    </StrExpandedRow>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </StyledTable>
      </div>
    </TableContainer>
  )
}

export default HaplotypeVariantTable
