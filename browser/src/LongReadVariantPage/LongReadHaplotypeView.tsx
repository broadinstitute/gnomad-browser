import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { debounce } from 'lodash-es'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { TrackPageSection } from '../TrackPage'

import HaplotypeTrack, { HaplotypeGroups, Methylation, MethylationSummaryPoint } from '../Haplotypes'
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
        samples { sample_id }
        variants {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop major_consequence sv_consequences dbgap_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        below_threshold {
          variants { locus chrom position alleles rsid qual filters info_AF info_AC info_AN info_CM info_SVTYPE info_SVLEN gt_alleles gt_phased allele_type allele_length gnomad_v4_match_type info_AF_afr info_AF_amr info_AF_eas info_AF_nfe info_AF_sas cadd_phred phylop major_consequence sv_consequences dbgap_id tr_id tr_motifs tr_struc allele_methylation motif_counts allele_purity }
          readable_id
        }
        start stop hash
      }
    }
  }
`

const METHYLATION_SUMMARY_QUERY = `
  query RegionMethylationSummary($chrom: String!, $start: Int!, $stop: Int!) {
    methylation_summary(chrom: $chrom, start: $start, stop: $stop) {
      chrom pos1 pos2 mean_methylation mean_coverage num_samples std_methylation min_methylation max_methylation
    }
  }
`

const METHYLATION_OUTLIERS_QUERY = `
  query RegionMethylationOutliers($chrom: String!, $start: Int!, $stop: Int!) {
    methylation_outliers(chrom: $chrom, start: $start, stop: $stop) {
      total_cpg_sites total_samples
      samples { sample_id outlier_count outlier_fraction direction }
    }
  }
`

const METHYLATION_QUERY = `
  query RegionMethylation($chrom: String!, $start: Int!, $stop: Int!, $samples: [String!]) {
    methylation(chrom: $chrom, start: $start, stop: $stop, samples: $samples) {
      chr pos1 pos2 methylation sample coverage
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
  zoomRegion?: { start: number; stop: number } | null
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
  zoomRegion,
}: LongReadHaplotypeViewProps) => {
  const { chrom, start, stop } = gene

  // Haplotype mode state
  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [haplotypeLoading, setHaplotypeLoading] = useState(false)
  const [sampleMetadata, setSampleMetadata] = useState<SampleMetadataMap>(new Map())

  const [methylationData, setMethylationData] = useState<Methylation[]>([])
  const [methylationSummary, setMethylationSummary] = useState<MethylationSummaryPoint[]>([])
  const [methylationOutliers, setMethylationOutliers] = useState<any>(null)
  const [methylationLoading, setMethylationLoading] = useState(false)
  const [methylationSampleCount, setMethylationSampleCount] = useState(0)
  const [methylationTotalSamples, setMethylationTotalSamples] = useState(0)

  const [threshold, setThreshold] = useState(0)
  const [sortBy, setSortBy] = useState('similarity_score')
  const [plotType, setPlotType] = useState('lollipop')
  const [colorMode, setColorMode] = useState('allele')
  const [showGenealogy, setShowGenealogy] = useState(false)

  const [mqtlData, setMqtlData] = useState<any[]>([])
  const [mqtlLoading, setMqtlLoading] = useState(false)
  const [showMqtl, setShowMqtl] = useState(false)
  const [mqtlMinLogP, setMqtlMinLogP] = useState(0)

  const [hoveredVariantPosition, setHoveredVariantPosition] = useState<number | null>(null)

  // Use zoom region or gene bounds for haplotype queries
  const queryRegion = useMemo(
    () => ({
      start: zoomRegion?.start ?? start,
      stop: zoomRegion?.stop ?? stop,
    }),
    [zoomRegion, start, stop]
  )

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
          start: queryRegion.start,
          stop: queryRegion.stop,
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
    [chrom, queryRegion.start, queryRegion.stop, sortBy]
  )

  // Fetch haplotype groups
  useEffect(() => {
    debouncedFetchHaplotypeGroups(threshold)
  }, [chrom, queryRegion.start, queryRegion.stop, threshold, debouncedFetchHaplotypeGroups, sortBy])

  // Fetch methylation summary + outliers
  useEffect(() => {
    const fetchSummaryAndOutliers = async () => {
      try {
        const [summaryResult, outlierResult] = await Promise.all([
          fetchGraphQL(METHYLATION_SUMMARY_QUERY, { chrom, start, stop }),
          fetchGraphQL(METHYLATION_OUTLIERS_QUERY, { chrom, start, stop }),
        ])
        if (summaryResult.data?.methylation_summary) {
          setMethylationSummary(summaryResult.data.methylation_summary)
        }
        if (outlierResult.data?.methylation_outliers) {
          setMethylationOutliers(outlierResult.data.methylation_outliers)
        }
      } catch (error) {
        console.error('Error fetching methylation data:', error)
      }
    }
    fetchSummaryAndOutliers()
  }, [chrom, start, stop])

  // Auto-fetch per-sample methylation for top outlier samples
  const MAX_AUTO_FETCH_OUTLIERS = 10
  useEffect(() => {
    const fetchOutlierMethylation = async () => {
      if (!methylationOutliers?.samples?.length) return

      const topOutliers = methylationOutliers.samples
        .slice(0, MAX_AUTO_FETCH_OUTLIERS)
        .filter((s: any) => s.outlier_count > 0)
        .map((s: any) => s.sample_id)

      if (topOutliers.length === 0) return

      setMethylationLoading(true)
      try {
        const result = await fetchGraphQL(METHYLATION_QUERY, {
          chrom, start, stop, samples: topOutliers,
        })
        if (result.data?.methylation) {
          setMethylationData(result.data.methylation)
          setMethylationSampleCount(0)
        }
      } catch (error) {
        console.error('Error fetching outlier methylation:', error)
      } finally {
        setMethylationLoading(false)
      }
    }
    fetchOutlierMethylation()
  }, [chrom, start, stop, methylationOutliers])

  // Load all sample methylation (triggered from HaplotypeTrack)
  const handleLoadAllSamples = useCallback(async () => {
    if (!haplotypeGroups || haplotypeGroups.groups.length === 0) return

    const allSampleIds = Array.from(new Set(
      haplotypeGroups.groups.flatMap(g => g.samples.map(s => s.sample_id))
    ))
    if (allSampleIds.length === 0) return

    setMethylationLoading(true)
    setMethylationSampleCount(0)
    setMethylationTotalSamples(allSampleIds.length)

    const BATCH_SIZE = 5
    let accumulated: Methylation[] = [...methylationData]
    let completed = 0

    for (let i = 0; i < allSampleIds.length; i += BATCH_SIZE) {
      const batch = allSampleIds.slice(i, i + BATCH_SIZE)
      try {
        const result = await fetchGraphQL(METHYLATION_QUERY, {
          chrom, start, stop, samples: batch,
        })
        if (result.data?.methylation) {
          accumulated = [...accumulated, ...result.data.methylation]
          setMethylationData(accumulated)
        }
      } catch (error) {
        console.error(`Error fetching batch ${i / BATCH_SIZE}:`, error)
      }
      completed += batch.length
      setMethylationSampleCount(completed)
    }

    setMethylationLoading(false)
  }, [chrom, start, stop, haplotypeGroups, methylationData])

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
      <RecombinationRatePlot chrom={chrom} start={queryRegion.start} stop={queryRegion.stop} />
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
          methylationData={methylationData}
          methylationSummary={methylationSummary}
          sampleMetadata={sampleMetadata}
          start={queryRegion.start}
          stop={queryRegion.stop}
          initialMinAf={threshold}
          onMinAfChange={setThreshold}
          initialSortBy={sortBy}
          onSortModeChange={setSortBy}
          onLoadAllSamples={handleLoadAllSamples}
          methylationLoading={methylationLoading}
          methylationSampleCount={methylationSampleCount}
          methylationTotalSamples={methylationTotalSamples}
          haplotypeLoading={haplotypeLoading}
          showMqtl={showMqtl}
          onShowMqtlChange={setShowMqtl}
          mqtlLoading={mqtlLoading}
          mqtlData={mqtlData}
          mqtlMinLogP={mqtlMinLogP}
          plotType={plotType}
          onPlotTypeChange={setPlotType}
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
