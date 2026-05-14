import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import HaplotypeVariantTable from './HaplotypeVariantTable'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type TrQualityCategory =
  | 'CLEAN'
  | 'BORDERLINE'
  | 'LEGIT_BINNED'
  | 'BOGUS_PURITY'
  | 'DEGENERATE_MOTIF'
  | 'SV_CONTAMINATION'
  | 'DELETION_BUG'

type TrCatalogLocus = {
  position: number
  category: TrQualityCategory
}

const CATEGORY_COLORS: Record<TrQualityCategory, string> = {
  CLEAN: '#2e7d32',
  BORDERLINE: '#f9a825',
  LEGIT_BINNED: '#1565c0',
  BOGUS_PURITY: '#c62828',
  DEGENERATE_MOTIF: '#e65100',
  SV_CONTAMINATION: '#6a1b9a',
  DELETION_BUG: '#212121',
}

const CATEGORY_LABELS: Record<TrQualityCategory, string> = {
  CLEAN: 'Clean',
  BORDERLINE: 'Borderline',
  LEGIT_BINNED: 'Legit Binned',
  BOGUS_PURITY: 'Bogus Purity',
  DEGENERATE_MOTIF: 'Degenerate Motif',
  SV_CONTAMINATION: 'SV Contamination',
  DELETION_BUG: 'Deletion Bug',
}

const ALL_CATEGORIES: TrQualityCategory[] = [
  'CLEAN',
  'BORDERLINE',
  'LEGIT_BINNED',
  'BOGUS_PURITY',
  'DEGENERATE_MOTIF',
  'SV_CONTAMINATION',
  'DELETION_BUG',
]

const SAMPLE_METADATA_QUERY = `
  query SampleMetadata {
    sample_metadata { sample_id subpopulation superpopulation }
  }
`

const STR_CATALOG_QUERY = `
  query StrCatalog($chrom: String!) {
    str_catalog(chrom: $chrom) { position category }
  }
`

const STR_HAPLOTYPES_QUERY = `
  query StrCatalogHaplotypes($chrom: String!) {
    str_catalog_haplotypes(chrom: $chrom) {
      groups {
        samples { sample_id }
        variants {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop sv_consequences dbgap_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        below_threshold {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop sv_consequences dbgap_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        start stop hash
      }
    }
  }
`

const fetchGraphQL = async (query: string, variables: any) => {
  const response = await fetch('/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  return response.json()
}

// --- Styled Components ---

const PageWrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
`

const Title = styled.h1`
  font-size: 24px;
  margin-bottom: 4px;
`

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 20px;
`

const SummaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
`

const SummaryTile = styled.div<{ color: string; active: boolean }>`
  padding: 10px 16px;
  border-radius: 6px;
  background: ${(p) => (p.active ? p.color : '#f5f5f5')};
  color: ${(p) => (p.active ? '#fff' : '#333')};
  border: 2px solid ${(p) => p.color};
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s;

  &:hover {
    opacity: 0.85;
  }
`

const TileCount = styled.span`
  font-size: 18px;
  margin-right: 6px;
`

const LoadingMessage = styled.div`
  padding: 40px;
  text-align: center;
  color: #666;
  font-size: 16px;
`

const ErrorMessage = styled.div`
  padding: 20px;
  color: #c62828;
  background: #fce4ec;
  border-radius: 6px;
  margin-bottom: 20px;
`

// --- Component ---

const TrCatalogPage = () => {
  const [allGroups, setAllGroups] = useState<any>(null)
  const [catalogLoci, setCatalogLoci] = useState<TrCatalogLocus[]>([])
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<TrQualityCategory | 'ALL'>('ALL')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [haploResult, catalogResult, metaResult] = await Promise.all([
          fetchGraphQL(STR_HAPLOTYPES_QUERY, { chrom: 'chr22' }),
          fetchGraphQL(STR_CATALOG_QUERY, { chrom: 'chr22' }),
          fetchGraphQL(SAMPLE_METADATA_QUERY, {}),
        ])
        if (haploResult.errors) {
          setError(haploResult.errors.map((e: any) => e.message).join(', '))
        } else {
          setAllGroups(haploResult.data.str_catalog_haplotypes)
        }
        if (catalogResult.data?.str_catalog) {
          setCatalogLoci(catalogResult.data.str_catalog)
        }
        if (metaResult.data?.sample_metadata) {
          const map: SampleMetadataMap = new Map()
          for (const s of metaResult.data.sample_metadata) {
            map.set(s.sample_id, { subpopulation: s.subpopulation, superpopulation: s.superpopulation })
          }
          setSampleMetadata(map)
        }
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Build position -> category lookup
  const positionCategory = useMemo(() => {
    const map = new Map<number, TrQualityCategory>()
    for (const l of catalogLoci) map.set(l.position, l.category)
    return map
  }, [catalogLoci])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of ALL_CATEGORIES) counts[cat] = 0
    for (const l of catalogLoci) counts[l.category] = (counts[l.category] || 0) + 1
    return counts
  }, [catalogLoci])

  // Filter haplotype groups to only include variants at positions matching the selected category
  const filteredGroups = useMemo(() => {
    if (!allGroups || categoryFilter === 'ALL') return allGroups

    const allowedPositions = new Set(
      catalogLoci.filter((l) => l.category === categoryFilter).map((l) => l.position)
    )

    const filtered = allGroups.groups
      .map((group: any) => {
        const filteredVariants = group.variants.variants.filter(
          (v: any) => allowedPositions.has(v.position)
        )
        if (filteredVariants.length === 0) return null
        return {
          ...group,
          variants: { ...group.variants, variants: filteredVariants },
          below_threshold: {
            ...group.below_threshold,
            variants: group.below_threshold.variants.filter(
              (v: any) => allowedPositions.has(v.position)
            ),
          },
        }
      })
      .filter(Boolean)

    return { groups: filtered }
  }, [allGroups, catalogLoci, categoryFilter])

  if (loading) return <LoadingMessage>Loading all TR haplotypes for chr22...</LoadingMessage>

  return (
    <PageWrapper>
      <Title>TR Catalog — chr22</Title>
      <Subtitle>
        All TRV haplotype variants across chr22. Filter by quality category. Dev-only audit tool.
      </Subtitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SummaryRow>
        <SummaryTile
          color="#555"
          active={categoryFilter === 'ALL'}
          onClick={() => setCategoryFilter('ALL')}
        >
          <TileCount>{catalogLoci.length}</TileCount>All
        </SummaryTile>
        {ALL_CATEGORIES.map((cat) => (
          <SummaryTile
            key={cat}
            color={CATEGORY_COLORS[cat]}
            active={categoryFilter === cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? 'ALL' : cat)}
          >
            <TileCount>{categoryCounts[cat]}</TileCount>
            {CATEGORY_LABELS[cat]}
          </SummaryTile>
        ))}
      </SummaryRow>

      {filteredGroups && (
        <HaplotypeVariantTable
          haplotypeGroups={filteredGroups}
          sampleMetadata={sampleMetadata}
          maxHeight="calc(100vh - 220px)"
        />
      )}
    </PageWrapper>
  )
}

export default TrCatalogPage
