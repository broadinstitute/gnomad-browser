import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { SUPERPOPULATION_COLORS, VARIANT_TYPE_COLORS } from './colors'
import type { HaplotypeGroup } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

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
  dominant_pop: string
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

const PopBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: ${(p) => p.$color};
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

const getVariantTypeCategory = (allele_type: string): 'snv' | 'indel' | 'sv' => {
  if (allele_type === 'snv') return 'snv'
  if (['del', 'ins'].includes(allele_type)) return 'indel'
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
  })

  // Derive unique variant list
  const variants = useMemo(() => {
    const map = new Map<
      string,
      {
        variant: any
        groupCount: number
        carrierIds: Set<string>
      }
    >()

    const totalGroups = haplotypeGroups.groups.length

    for (const group of haplotypeGroups.groups) {
      const seen = new Set<string>()
      for (const v of group.variants.variants) {
        const key = `${v.position}:${v.alleles[0]}:${v.alleles[1]}`
        if (seen.has(key)) continue
        seen.add(key)

        let entry = map.get(key)
        if (!entry) {
          entry = { variant: v, groupCount: 0, carrierIds: new Set() }
          map.set(key, entry)
        }
        entry.groupCount++
        for (const s of group.samples) {
          entry.carrierIds.add(s.sample_id)
        }
      }
    }

    const result: DerivedVariant[] = []
    for (const [, { variant: v, groupCount, carrierIds }] of map) {
      // Compute dominant pop
      const popCounts: Record<string, number> = {}
      for (const sid of carrierIds) {
        const meta = sampleMetadata.get(sid)
        const pop = meta?.superpopulation || 'N/A'
        popCounts[pop] = (popCounts[pop] || 0) + 1
      }
      let dominantPop = 'N/A'
      let maxCount = 0
      for (const [pop, count] of Object.entries(popCounts)) {
        if (count > maxCount) {
          maxCount = count
          dominantPop = pop
        }
      }

      result.push({
        variant_id: buildVariantId(v),
        position: v.position,
        chrom: v.chrom,
        ref: v.alleles[0],
        alt: v.alleles[1],
        allele_type: v.allele_type || 'snv',
        allele_length: v.allele_length || 0,
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
        dominant_pop: dominantPop,
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
      'dominant_pop',
      'sr_match',
      'rsid',
      'af_afr',
      'af_amr',
      'af_eas',
      'af_nfe',
      'af_sas',
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
        v.dominant_pop,
        v.gnomad_v4_match_type || '',
        v.rsid,
        v.info_AF_afr ?? '',
        v.info_AF_amr ?? '',
        v.info_AF_eas ?? '',
        v.info_AF_nfe ?? '',
        v.info_AF_sas ?? '',
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
        <SearchInput
          type="text"
          placeholder="Search position, rsID, allele…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <ExportButton onClick={exportCSV}>Export CSV</ExportButton>
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
              <th onClick={() => handleSort('dominant_pop')}>
                Dom. Pop{sortIndicator('dominant_pop')}
              </th>
              <th>Pop AF</th>
              <th onClick={() => handleSort('gnomad_v4_match_type')}>
                SR Match{sortIndicator('gnomad_v4_match_type')}
              </th>
              <th onClick={() => handleSort('rsid')}>rsID{sortIndicator('rsid')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => {
              const matchLevel = getMatchLevel(v.gnomad_v4_match_type)
              return (
                <tr
                  key={`${v.position}-${v.ref}-${v.alt}-${i}`}
                  onMouseEnter={() => onHoverVariant?.(v.position)}
                  onMouseLeave={() => onHoverVariant?.(null)}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{v.variant_id}</td>
                  <td>
                    <TypeDot $color={VARIANT_TYPE_COLORS[v.allele_type] || VARIANT_TYPE_COLORS.other} />
                    {v.allele_type}
                  </td>
                  <td>{v.allele_length}</td>
                  <td>{v.info_AF.toFixed(4)}</td>
                  <td>
                    {v.group_count} / {totalGroups}
                  </td>
                  <td>
                    {v.carrier_count} / {totalSamples}
                  </td>
                  <td>
                    <PopBadge $color={SUPERPOPULATION_COLORS[v.dominant_pop] || SUPERPOPULATION_COLORS['N/A']}>
                      {v.dominant_pop}
                    </PopBadge>
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
                    ) : (
                      <span style={{ color: '#ccc' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </StyledTable>
      </div>
    </TableContainer>
  )
}

export default HaplotypeVariantTable
