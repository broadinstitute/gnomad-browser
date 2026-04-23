import React, { useEffect, useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Page, PageHeading, Select } from '@gnomad/ui'
import { debounce } from 'lodash-es'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { HaplotypeGroups } from '../Haplotypes'
import { buildPangenomeGraph } from './pangenome-graph'
import PangenomeGraphRenderer from './PangenomeGraphRenderer'

const HAPLOTYPE_GROUPS_QUERY = `
  query RegionHaploGroups($chrom: String!, $start: Int!, $stop: Int!, $min_allele_freq: Float, $sort_by: String) {
    haplotype_groups(chrom: $chrom, start: $start, stop: $stop, min_allele_freq: $min_allele_freq, sort_by: $sort_by) {
      groups {
        samples { sample_id }
        variants {
          variants { locus chrom position alleles rsid info_SVTYPE info_SVLEN }
          readable_id
        }
        below_threshold {
          variants { locus chrom position alleles rsid info_SVTYPE info_SVLEN }
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

const Controls = styled.div`
  display: flex;
  gap: 1em;
  margin-bottom: 1em;
  align-items: center;
`

type Props = { datasetId: DatasetId; region: any }

const PangenomeExplorerPage = ({ datasetId, region }: Props) => {
  const { chrom, start, stop } = region
  const [haplotypeGroups, setHaplotypeGroups] = useState<HaplotypeGroups>({ groups: [] })
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(0)
  const [layoutType, setLayoutType] = useState('alluvial')

  const debouncedFetch = useCallback(
    debounce(async (currentThreshold: number) => {
      setLoading(true)
      try {
        const result = await fetchGraphQL(HAPLOTYPE_GROUPS_QUERY, {
          chrom,
          start,
          stop,
          min_allele_freq: currentThreshold,
          sort_by: 'similarity_score',
        })
        if (result.data?.haplotype_groups) {
          setHaplotypeGroups(result.data.haplotype_groups)
        }
      } catch (error) {
        console.error('Error fetching haplotype groups:', error)
      } finally {
        setLoading(false)
      }
    }, 300),
    [chrom, start, stop]
  )

  useEffect(() => {
    debouncedFetch(threshold)
  }, [debouncedFetch, threshold])

  const graphData = useMemo(() => {
    if (!haplotypeGroups.groups.length) return null
    return buildPangenomeGraph(haplotypeGroups.groups, start, stop)
  }, [haplotypeGroups, start, stop])

  return (
    <Page>
      <PageHeading>
        Pangenome Explorer: {chrom}-{start}-{stop}
      </PageHeading>
      <Controls>
        <label>
          Layout Strategy:{' '}
          <Select value={layoutType} onChange={(e: any) => setLayoutType(e.target.value)}>
            <option value="alluvial">Alluvial Flow (Sankey-style)</option>
            <option value="heatmap">Binned Heatmap (Odgi-style)</option>
          </Select>
        </label>
        <label>
          Min AF Threshold: {threshold.toFixed(2)}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ marginLeft: '10px' }}
          />
        </label>
      </Controls>

      {loading ? (
        <p>Loading topological data...</p>
      ) : graphData ? (
        <div
          style={{
            minHeight: '500px',
            maxHeight: '800px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'auto',
          }}
        >
          <PangenomeGraphRenderer
            graphData={graphData}
            layoutType={layoutType}
            width={1200}
            height={600}
          />
        </div>
      ) : (
        <p>No haplotype groups found for this region/threshold.</p>
      )}
    </Page>
  )
}
export default PangenomeExplorerPage
