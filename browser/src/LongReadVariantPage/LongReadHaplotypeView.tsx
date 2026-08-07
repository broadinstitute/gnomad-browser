import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { debounce } from 'lodash-es'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, { HaplotypeGroups } from '../Haplotypes'
import HaplotypeVariantTable from '../Haplotypes/HaplotypeVariantTable'
import RecombinationRatePlot from '../Haplotypes/RecombinationRate'
import MQTLTrack from '../Haplotypes/MQTLTrack'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

// --- GraphQL queries (ported from HaplotypeRegionPage) ---

const SAMPLE_METADATA_QUERY = `
  query RegionSampleMetadata {
    sample_metadata { sample_id subpopulation superpopulation }
  }
`

const HAPLOTYPE_GROUPS_QUERY = `
  query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String) {
    haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by) {
      groups {
        samples { sample_id vcf_strand phase_set }
        variants {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop sv_consequences dbsnp_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        below_threshold {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop sv_consequences dbsnp_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        start stop hash
      }
    }
  }
`

const MQTL_QUERY = `
  query RegionMQTL($chrom: String!, $start: Int!, $stop: Int!, $min_af: Float) {
    mqtl_associations(chrom: $chrom, start: $start, stop: $stop, min_af: $min_af) {
      variant_id variant_pos cpg_pos p_value effect_size carrier_count non_carrier_count
    }
  }
`

// --- Styled components ---

const InfoBanner = styled.div`
  background: #fff3e0;
  border: 1px solid #ffe0b2;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  color: #e65100;
  margin-bottom: 12px;
`

// --- Component ---

type LongReadHaplotypeViewProps = {
  datasetId: DatasetId
  gene: {
    gene_id?: string
    symbol?: string
    chrom: string
    start: number
    stop: number
  }
}

const fetchGraphQL = async (query: string, variables: any) => {
  const response = await fetch('/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  return response.json()
}

const LongReadHaplotypeView = ({
  datasetId,
  gene,
}: LongReadHaplotypeViewProps) => {
  const { chrom, start, stop } = gene

  // Haplotype mode state
  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [haplotypeLoading, setHaplotypeLoading] = useState(false)
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())

  const [threshold, setThreshold] = useState(0)
  const [sortBy, setSortBy] = useState('similarity_score')
  const [colorMode, setColorMode] = useState('sv_type')
  const [showGenealogy, setShowGenealogy] = useState(false)

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)

  // Fetch sample metadata once
  useEffect(() => {
    if (sampleMetadata.size > 0) return

    const fetchMeta = async () => {
      try {
        const result = await fetchGraphQL(SAMPLE_METADATA_QUERY, {})
        if (result.data?.sample_metadata) {
          const map: SampleMetadataMap = new Map()
          for (const s of result.data.sample_metadata) {
            map.set(s.sample_id, { subpopulation: s.subpopulation, superpopulation: s.superpopulation })
          }
          setSampleMetadata(map)
        }
      } catch (error) {
        console.error('Error fetching sample metadata:', error)
      }
    }
    fetchMeta()
  }, [sampleMetadata.size])

  // Debounced haplotype group fetch
  const debouncedFetchHaplotypeGroups = useCallback(
    debounce(async (currentThreshold: number) => {
      setHaplotypeLoading(true)
      try {
        const result = await fetchGraphQL(HAPLOTYPE_GROUPS_QUERY, {
          chrom,
          start: start,
          stop: stop,
          min_allele_freq: currentThreshold,
          sort_by: sortBy,
        })
        if (result.data?.haplotype_groups) {
          setHaplotypeGroups(result.data.haplotype_groups)
        }
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      } finally {
        setHaplotypeLoading(false)
      }
    }, 300),
    [chrom, start, stop, sortBy]
  )

  // Fetch haplotype groups
  useEffect(() => {
    debouncedFetchHaplotypeGroups(threshold)
  }, [chrom, start, stop, threshold, debouncedFetchHaplotypeGroups, sortBy])

  // Fetch mQTLs when enabled
  useEffect(() => {
    if (!showMqtl) return
    const fetchMQTLs = async () => {
      setMqtlLoading(true)
      try {
        const result = await fetchGraphQL(MQTL_QUERY, { chrom, start, stop, min_af: threshold })
        if (result.data?.mqtl_associations) {
          setMqtlData(result.data.mqtl_associations)
        }
      } catch (e) {
        console.error('Error fetching mQTLs:', e)
      } finally {
        setMqtlLoading(false)
      }
    }
    fetchMQTLs()
  }, [chrom, start, stop, threshold, showMqtl])

  return (
    <>
      <RecombinationRatePlot chrom={chrom} start={start} stop={stop} />
      {showMqtl && (
        <MQTLTrack
          mqtlData={mqtlData}
          loading={mqtlLoading}
          minLogP={mqtlMinLogP}
          onMinLogPChange={setMqtlMinLogP}
        />
      )}
      {haplotypeGroups && (
        <HaplotypeTrack
          haplotypeGroups={haplotypeGroups.groups}
          methylationData={[]}
          sampleMetadata={sampleMetadata}
          start={start}
          stop={stop}
          initialMinAf={threshold}
          onMinAfChange={setThreshold}
          initialSortBy={sortBy}
          onSortModeChange={setSortBy}
          haplotypeLoading={haplotypeLoading}
          showMqtl={showMqtl}
          onShowMqtlChange={setShowMqtl}
          mqtlLoading={mqtlLoading}
          mqtlData={mqtlData}
          mqtlMinLogP={mqtlMinLogP}
          initialColorMode={colorMode}
          onColorModeChange={setColorMode}
          showGenealogy={showGenealogy}
          onShowGenealogyChange={setShowGenealogy}
          hoveredVariantPosition={hoveredVariantPosition}
        />
      )}
      <PositionAxisTrack />

      <TrackPageSection>
        <InfoBanner>
          Viewing phased haplotypes for a deeply-sequenced subset of 292 samples.
          Some rare variants from the full summary callset may not appear in this mode.
        </InfoBanner>
      </TrackPageSection>

      <TrackPageSection>
        {haplotypeGroups && (
          <HaplotypeVariantTable
            mode="haplotype"
            haplotypeGroups={haplotypeGroups}
            sampleMetadata={sampleMetadata}
            onHoverVariant={setHoveredVariantPosition}
          />
        )}
      </TrackPageSection>
    </>
  )
}

export default LongReadHaplotypeView
