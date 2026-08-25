import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import type { HaplotypeGroup, LRVariant } from '../Haplotypes'
import { AccordionCoordinateMapper } from '../Haplotypes/AccordionCoordinateMapper'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { PATH_COLORS, SUPERPOPULATION_COLORS } from '../Haplotypes/colors'
import { decomposeExactTrAlt } from '../Haplotypes/trAlleleStructureData'
import {
  getAutoClusterThreshold,
  normalizeHaplotypeWorkerData,
  type ComputedHaplotypeData,
  type HaplotypeTargetDescriptor,
  type RawPayload,
} from '../Haplotypes/haplotypeCompute'
import { parseHaplotypeResponse } from '../LongReadVariantPage/haplotypeResponse'
import { useWindowSize } from '../windowSize'
import { Panel, signed } from './LongReadTrVisualizations'
import type { LongReadTrAllele, LongReadTrLocus } from './types'
import {
  buildLocalHaplotypeTargetDescriptor,
  exactAlleleIdentity,
  localTargetRows,
  serializeTargetDescriptor,
  validateLocalHaplotypePayload,
} from './localHaplotypeTarget'

const LocalHaplotypeTrack = React.lazy(() => import('./LocalHaplotypeTrack'))

const MAX_EXACT_SEQUENCE_BASES = 2_000
const MAX_EXACT_SEQUENCE_TOKENS = 256
const MAX_MOTIF_COUNT = 64
const MAX_MOTIF_BASES = 1_000
const MAX_MIXED_STRIPS = 3

const Heading = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4em;

  h2 {
    margin-right: 0;
  }
`

const ExperimentalBadge = styled.span`
  padding: 0.12em 0.45em;
  border-radius: 3px;
  background: #e7f0ff;
  color: #174ea6;
  font-size: 0.72rem;
  font-weight: bold;
  text-transform: uppercase;
`

const ControlBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75em 1.5em;
  margin: 0.5em 0 0.75em;
`

const ResolutionControl = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.875rem;
  font-weight: bold;

  input {
    inline-size: 180px;
  }
`

export const LocalHaplotypeHorizontalScroller = styled.div.attrs({
  role: 'region',
  tabIndex: 0,
})`
  box-sizing: border-box;
  width: 100%;
  overflow-x: auto;
  min-width: 0;
  max-width: 100%;
  outline-offset: 2px;

  &:focus-visible {
    outline: 3px solid #111;
  }
`

const TargetRows = styled(LocalHaplotypeHorizontalScroller)`
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
`

const TargetHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(165px, 0.9fr) minmax(300px, 3fr) minmax(170px, 1fr);
  gap: 0.75em;
  min-width: 720px;
  padding: 0.4em 0.65em;
  background: #f7f7f7;
  font-weight: bold;
`

const TargetRow = styled.div`
  display: grid;
  grid-template-columns: minmax(165px, 0.9fr) minmax(300px, 3fr) minmax(170px, 1fr);
  gap: 0.75em;
  align-items: center;
  min-width: 720px;
  padding: 0.45em 0.65em;
  border-top: 1px solid #eee;
`

const ClusterSummary = styled.div<{ $containsSelected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.15em;
  padding: 3px 5px;
  border: ${({ $containsSelected }) =>
    $containsSelected ? '2px solid #111' : '1px solid transparent'};
  border-radius: 3px;
`

const StripStack = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
`

const SequenceStrip = styled.div<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: minmax(100px, max-content) minmax(100px, 1fr);
  align-items: center;
  gap: 0.5em;
  min-width: 0;
  padding: 2px 4px;
  border: ${({ $selected }) => ($selected ? '2px solid #111' : '1px solid #bbb')};
  border-radius: 3px;
  background: #fff;
`

const TokenBar = styled.span`
  display: flex;
  min-width: 100px;
  height: 10px;
  overflow: hidden;
  border-radius: 2px;
  background: #ddd;
`

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em 0.8em;
  margin-top: 0.6em;
  font-size: 0.75rem;
`

const LegendKey = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
`

const ViewerShell = styled(LocalHaplotypeHorizontalScroller)`
  margin-top: 0.75em;
`

const fetchTargetHaplotypePayload = async (
  descriptor: HaplotypeTargetDescriptor,
  signal: AbortSignal
): Promise<RawPayload> => {
  const params = new URLSearchParams({
    chrom: descriptor.fixed_window.chrom,
    start: String(descriptor.fixed_window.start),
    stop: String(descriptor.fixed_window.stop),
    lr_cohort: 'hgsvc_hprc',
    target_descriptor: serializeTargetDescriptor(descriptor),
  })
  const response = await fetch(`/api/lr/haplotype-groups?${params}`, { signal })
  const text = await response.text()
  return parseHaplotypeResponse(response, text)
}

const SAMPLE_METADATA_QUERY = `
  query LocalTrHaplotypeSampleMetadata($lr_cohort: LongReadCohort!) {
    sample_metadata(lr_cohort: $lr_cohort) { sample_id subpopulation superpopulation }
  }
`

const fetchSampleMetadata = async (signal: AbortSignal) => {
  const response = await fetch('/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: SAMPLE_METADATA_QUERY,
      variables: { lr_cohort: 'hgsvc_hprc' },
    }),
    signal,
  })
  if (!response.ok) throw new Error('Unable to load ancestry metadata')
  const result = await response.json()
  const metadata = new Map<string, { subpopulation: string; superpopulation: string }>()
  ;(result.data?.sample_metadata || []).forEach((sample: any) => {
    metadata.set(sample.sample_id, {
      subpopulation: sample.subpopulation,
      superpopulation: sample.superpopulation,
    })
  })
  return metadata
}

const deckColor = (color: string): [number, number, number, number] => [
  parseInt(color.slice(1, 3), 16),
  parseInt(color.slice(3, 5), 16),
  parseInt(color.slice(5, 7), 16),
  255,
]

const exactAlleleLabel = (allele: LongReadTrAllele | undefined, exactId: string) => {
  if (!allele) return exactId
  const delta =
    allele.ref != null && allele.alt != null ? allele.alt.length - allele.ref.length : allele.length
  return `ALT ${allele.alt_index}${delta == null ? '' : ` · ${signed(delta)} bp`}`
}

const boundedExactTrDecomposition = (
  allele: LongReadTrAllele | undefined,
  motifs: readonly string[]
) => {
  if (
    !allele?.ref ||
    !allele.alt ||
    allele.ref.length > MAX_EXACT_SEQUENCE_BASES ||
    allele.alt.length > MAX_EXACT_SEQUENCE_BASES ||
    motifs.length === 0 ||
    motifs.length > MAX_MOTIF_COUNT ||
    motifs.some((motif) => !motif || motif.length > MAX_MOTIF_BASES) ||
    motifs.reduce((total, motif) => total + motif.length, 0) > MAX_MOTIF_BASES
  )
    return null
  const result = decomposeExactTrAlt({ ref: allele.ref, alt: allele.alt, motifs })
  if (result.status !== 'available' || result.structure.tokens.length > MAX_EXACT_SEQUENCE_TOKENS) {
    return null
  }
  return result
}

export const boundedRowExactAlleleIds = (
  exactAlleleIds: readonly string[],
  selectedExactAlleleId: string | undefined,
  limit = MAX_MIXED_STRIPS
) => {
  if (limit < 1) return { displayed: [] as string[], omitted: [...exactAlleleIds] }
  const displayed = exactAlleleIds.slice(0, limit)
  if (
    selectedExactAlleleId &&
    exactAlleleIds.includes(selectedExactAlleleId) &&
    !displayed.includes(selectedExactAlleleId)
  ) {
    displayed[displayed.length - 1] = selectedExactAlleleId
  }
  const displayedSet = new Set(displayed)
  return {
    displayed,
    omitted: exactAlleleIds.filter((exactId) => !displayedSet.has(exactId)),
  }
}

export const decomposeUniqueExactAlleles = ({
  exactAlleleIds,
  alleleByExactId,
  motifs,
  decompose = boundedExactTrDecomposition,
}: {
  exactAlleleIds: readonly string[]
  alleleByExactId: ReadonlyMap<string, LongReadTrAllele>
  motifs: readonly string[]
  decompose?: typeof boundedExactTrDecomposition
}) => {
  const decompositions = new Map<string, ReturnType<typeof boundedExactTrDecomposition>>()
  new Set(exactAlleleIds).forEach((exactId) => {
    decompositions.set(exactId, decompose(alleleByExactId.get(exactId), motifs))
  })
  return decompositions
}

export const ExactSequenceStrip = ({
  allele,
  exactId,
  motifs,
  selected,
  precomputedDecomposition,
}: {
  allele: LongReadTrAllele | undefined
  exactId: string
  motifs: readonly string[]
  selected: boolean
  precomputedDecomposition?: ReturnType<typeof boundedExactTrDecomposition>
}) => {
  const decomposition = useMemo(
    () =>
      precomputedDecomposition === undefined
        ? boundedExactTrDecomposition(allele, motifs)
        : precomputedDecomposition,
    [allele, motifs, precomputedDecomposition]
  )
  const label = exactAlleleLabel(allele, exactId)
  const tokensWithOffsets = decomposition
    ? decomposition.structure.tokens.map((token, index, tokens) => ({
        token,
        offset: tokens
          .slice(0, index)
          .reduce((total, previous) => total + previous.sequence.length, 0),
      }))
    : []

  return (
    <SequenceStrip
      $selected={selected}
      data-exact-allele-id={exactId}
      data-selected-exact-allele={selected ? 'true' : 'false'}
      tabIndex={0}
      aria-label={`${label}; observed exact allele${selected ? '; selected' : ''}${
        decomposition ? '; motif-highlighted sequence' : '; exact sequence preview unavailable'
      }`}
      title={`${exactId} — observed exact allele, not a cluster consensus`}
    >
      <code>
        {label}
        {selected ? ' · Selected' : ''}
      </code>
      {decomposition ? (
        <TokenBar aria-hidden="true">
          {tokensWithOffsets.map(({ token, offset }) => (
            <span
              // Tokens are an ordered decomposition of one exact observed sequence.
              // Their widths encode bases only; they are not component repeat counts.
              key={`${offset}-${token.type}-${token.sequence}`}
              style={{
                flexGrow: token.sequence.length,
                flexBasis: 0,
                minWidth: 1,
                backgroundColor:
                  token.type === 'motif'
                    ? PATH_COLORS[token.motifIndex % PATH_COLORS.length]
                    : '#444',
              }}
            />
          ))}
        </TokenBar>
      ) : (
        <span>Exact identity / length glyph (sequence preview unavailable)</span>
      )}
    </SequenceStrip>
  )
}

const LocalSimilarityHelp = () => (
  <HaplotypeHelpButton title="About local haplotype similarity">
    <p style={{ marginTop: 0 }}>
      Rows are local flanking-variant similarity clusters in the fixed, contig-clipped canonical
      envelope ±50 kb. Every source record at the target tandem-repeat locus is excluded before
      Jaccard distance and UPGMA clustering are computed.
    </p>
    <p>
      The selected exact target allele and observed sequence strips are joined after clustering by
      <code>source_variant_id~alt_index</code>. They cannot change signatures, distances, the tree,
      or row order. Unphased ambiguous copies are not assigned.
    </p>
    <p style={{ marginBottom: 0 }}>
      Branch length is similarity distance, not time, generations, ancestry, founder status, or
      origin. Cluster numbering can change when Resolution changes.
    </p>
  </HaplotypeHelpButton>
)

const LocalHaplotypeBackgroundsSection = ({
  locus,
  selectedAlleleId,
}: {
  locus: LongReadTrLocus
  selectedAlleleId?: string
}) => {
  const { width: windowWidth } = useWindowSize()
  const workerRef = useRef<Worker | null>(null)
  const [data, setData] = useState<ComputedHaplotypeData | null>(null)
  const [metadata, setMetadata] = useState<
    Map<string, { subpopulation: string; superpopulation: string }>
  >(new Map())
  const [status, setStatus] = useState('Loading local haplotypes…')
  const [error, setError] = useState<string | null>(null)
  const [resolution, setResolution] = useState(0)
  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<string>>(new Set())

  const selected =
    locus.selected_allele ||
    locus.alleles.nodes.find((allele) => allele.variant_id === selectedAlleleId) ||
    null
  const selectedSourceAc = selected?.freq.all.ac ?? null
  const descriptor = useMemo(() => {
    if (!selected || locus.lr_cohort !== 'hgsvc_hprc') return null
    return buildLocalHaplotypeTargetDescriptor({
      chrom: locus.chrom,
      envelopeStart: locus.region.start0 + 1,
      envelopeStop: locus.region.end0,
      sourceVariantIds: locus.source_records.map((record) => record.source_variant_id),
      selectedExactAlleleId: exactAlleleIdentity(selected.source_variant_id, selected.alt_index),
    })
  }, [
    locus.chrom,
    locus.lr_cohort,
    locus.region.end0,
    locus.region.start0,
    locus.source_records,
    selected,
  ])

  useEffect(() => {
    setData(null)
    setError(null)
    if (!descriptor) return undefined
    const controller = new AbortController()
    let active = true
    let worker: Worker | null = null

    Promise.all([
      import('../Haplotypes/createHaplotypeWorker'),
      fetchTargetHaplotypePayload(descriptor, controller.signal),
      fetchSampleMetadata(controller.signal),
    ])
      .then(([workerModule, payload, sampleMetadata]) => {
        if (!active) return
        validateLocalHaplotypePayload({
          payload,
          descriptor,
          expectedRunId: locus.source_run_id,
          expectedRelease: locus.source_release,
          expectedSelectedAc: selectedSourceAc!,
        })
        try {
          worker = workerModule.createHaplotypeWorker()
        } catch {
          throw new Error('Local haplotype computation is unavailable in this browser.')
        }
        workerRef.current = worker
        worker.onmessage = (event: MessageEvent) => {
          if (!active) return
          if (event.data.type === 'PROGRESS') setStatus(event.data.status)
          if (event.data.type === 'READY' || event.data.type === 'UPDATED') {
            const normalized = normalizeHaplotypeWorkerData(event.data.data)
            setData(normalized)
            setStatus('')
          }
          if (event.data.type === 'ERROR') {
            setError(event.data.error || 'Local haplotype computation failed.')
            setStatus('')
          }
        }
        worker.onerror = () => {
          if (active) setError('Local haplotype computation failed.')
        }

        // Keep local defaults target-independent: the server's general auto-tuner sees all
        // variants, whereas this view must derive no representation choice from target ALTs.
        const floor = payload.auto_defaults?.floor ?? 0.001
        const initialResolution = getAutoClusterThreshold(
          descriptor.fixed_window.stop - descriptor.fixed_window.start
        )
        const rawData = {
          ...payload,
          target_descriptor: descriptor,
          auto_defaults: {
            floor,
            ceiling: payload.auto_defaults?.ceiling ?? 1,
            defaultAf: floor,
            defaultClusterThreshold: initialResolution,
            isClusteredView: true,
          },
        }
        setMetadata(sampleMetadata)
        setResolution(initialResolution)
        setStatus('Computing local similarity clusters…')
        worker.postMessage({
          type: 'INIT',
          rawData,
          minAf: floor,
          isClusteredView: true,
          clusterThreshold: initialResolution,
          sortBy: 'similarity_score',
          distanceMetric: 'auto',
          regionSize: descriptor.fixed_window.stop - descriptor.fixed_window.start,
        })
      })
      .catch((requestError: any) => {
        if (!active || requestError?.name === 'AbortError') return
        setStatus('')
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to load local haplotypes.'
        )
      })

    return () => {
      active = false
      controller.abort()
      worker?.terminate()
      if (workerRef.current === worker) workerRef.current = null
    }
  }, [descriptor, locus.source_release, locus.source_run_id, selectedSourceAc])

  const changeResolution = (next: number) => {
    setResolution(next)
    setStatus('Updating cluster cut…')
    workerRef.current?.postMessage({ type: 'UPDATE_THRESHOLD', clusterThreshold: next })
  }

  const haplotypeGroups = useMemo(
    () =>
      (data?.groups || []).filter((group): group is HaplotypeGroup => !('is_diplotype' in group)),
    [data?.groups]
  )
  const rows = useMemo(() => {
    if (!data?.clusters || !data.target_display_sidecar) return []
    return localTargetRows({
      clusters: data.clusters,
      groups: haplotypeGroups,
      sidecar: data.target_display_sidecar,
    })
  }, [data?.clusters, data?.target_display_sidecar, haplotypeGroups])
  const alleleByExactId = useMemo(() => {
    const alleles = [...locus.alleles.nodes]
    if (locus.selected_allele) alleles.push(locus.selected_allele)
    return new Map(
      alleles.map((allele) => [
        exactAlleleIdentity(allele.source_variant_id, allele.alt_index),
        allele,
      ])
    )
  }, [locus.alleles.nodes, locus.selected_allele])
  const decompositionByExactId = useMemo(
    () =>
      decomposeUniqueExactAlleles({
        exactAlleleIds: rows.flatMap((row) => row.exactAlleleIds),
        alleleByExactId,
        motifs: locus.motifs,
      }),
    [alleleByExactId, locus.motifs, rows]
  )
  const targetTrackOverlay = useMemo(
    () => ({
      envelope: descriptor?.canonical_envelope || { start: 0, stop: 0 },
      rows: rows.map((row) => ({
        clusterId: row.clusterId,
        label: row.label,
        representedCopyCount: row.representedCopyCount,
        selectedCopyCount: row.selectedCopyCount,
        strips: boundedRowExactAlleleIds(
          row.exactAlleleIds,
          descriptor?.selected_exact_allele_id
        ).displayed.map((exactId) => {
          const decomposition = decompositionByExactId.get(exactId)
          return {
            exactId,
            label: exactAlleleLabel(alleleByExactId.get(exactId), exactId),
            selected: exactId === descriptor?.selected_exact_allele_id,
            segments: decomposition
              ? decomposition.structure.tokens.map((token) => ({
                  weight: token.sequence.length,
                  color:
                    token.type === 'motif'
                      ? deckColor(PATH_COLORS[token.motifIndex % PATH_COLORS.length])
                      : ([68, 68, 68, 255] as [number, number, number, number]),
                }))
              : [],
          }
        }),
      })),
    }),
    [alleleByExactId, decompositionByExactId, descriptor, rows]
  )
  const representedSuperpopulations = useMemo(() => {
    const ids = new Set<string>()
    haplotypeGroups.forEach((group) =>
      group.samples.forEach((sample) => {
        const id = metadata.get(sample.sample_id)?.superpopulation
        if (id) ids.add(id)
      })
    )
    return [...ids].sort()
  }, [haplotypeGroups, metadata])
  const accordionMapper = useMemo(() => {
    if (!descriptor) return null
    const longestDelta = Math.max(
      50,
      ...locus.alleles.nodes.map((allele) =>
        Math.abs(
          allele.ref != null && allele.alt != null
            ? allele.alt.length - allele.ref.length
            : allele.length || 0
        )
      )
    )
    const targetVariant = {
      pos: locus.source_records[0]?.position || descriptor.canonical_envelope.start,
      allele_type: 'trv',
      allele_length: longestDelta,
    } as LRVariant
    return new AccordionCoordinateMapper(descriptor.fixed_window, [targetVariant], true)
  }, [descriptor, locus.alleles.nodes, locus.source_records])

  const toggleClusterExpansion = (clusterId: string) => {
    setExpandedClusterIds((current) => {
      const next = new Set(current)
      if (next.has(clusterId)) next.delete(clusterId)
      else next.add(clusterId)
      return next
    })
  }

  const selectedExactId = descriptor?.selected_exact_allele_id
  const counts = data?.target_display_sidecar?.counts
  const viewerWidth = Math.max(720, Math.min(1360, windowWidth - 64))
  const sectionHeading = (
    <Heading>
      <h2 id="lr-tr-local-haplotype-heading">Explore local haplotype backgrounds</h2>
      <ExperimentalBadge>Experimental</ExperimentalBadge>
      <LocalSimilarityHelp />
    </Heading>
  )
  const statusPanel = (content: React.ReactNode) => (
    <Panel aria-labelledby="lr-tr-local-haplotype-heading">
      {sectionHeading}
      {content}
    </Panel>
  )

  if (locus.lr_cohort !== 'hgsvc_hprc') {
    return statusPanel(
      <p role="status">
        Local haplotype backgrounds are unavailable for this cohort. HGSVC / HPRC phased carrier
        data are required.
      </p>
    )
  }
  if (!selected) {
    return statusPanel(
      <p role="status">
        Select an exact allele in the Allelic landscape to explore its local haplotype backgrounds.
      </p>
    )
  }
  if (error) {
    return statusPanel(<p role="alert">Local haplotype backgrounds unavailable: {error}</p>)
  }
  if (!data || !descriptor || !accordionMapper) {
    return statusPanel(<p role="status">{status || 'Loading local haplotypes…'}</p>)
  }
  if (
    !counts?.selected_exact_allele_ac_reconciled ||
    counts.selected_exact_allele_source_ac !== selectedSourceAc ||
    counts.selected_exact_allele_assigned_copy_count !== selectedSourceAc
  ) {
    return statusPanel(
      <p role="alert">
        Local haplotype backgrounds unavailable: selected exact-allele assignments do not reconcile
        to source allele count.
      </p>
    )
  }

  return (
    <Panel aria-labelledby="lr-tr-local-haplotype-heading">
      {sectionHeading}
      <>
        <ControlBar>
          <strong role="status">
            {counts.selected_exact_allele_assigned_copy_count}/
            {counts.selected_exact_allele_source_ac} selected ALT copies assigned;{' '}
            {counts.selected_exact_allele_usable_flanking_signature_copy_count} represented in
            clusters
            {counts.selected_exact_allele_no_usable_flanking_signature_copy_count > 0 &&
              `; ${counts.selected_exact_allele_no_usable_flanking_signature_copy_count} without a usable flanking signature`}
          </strong>
          <ResolutionControl>
            Resolution
            <input
              aria-label="Local haplotype resolution"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={resolution}
              onChange={(event) => changeResolution(Number(event.target.value))}
            />
            <output>
              {resolution.toFixed(2)} · {rows.length} clusters
            </output>
          </ResolutionControl>
        </ControlBar>

        <TargetRows aria-label="Observed exact target alleles by local similarity cluster">
          <TargetHeader>
            <span>Cluster and selected exact allele</span>
            <span>Fixed, contig-clipped ±50 kb region · observed target sequence band</span>
            <span>Local haplotype similarity</span>
          </TargetHeader>
          {rows.map((row) => (
            <TargetRow key={row.clusterId} data-cluster-label={row.label}>
              <ClusterSummary
                $containsSelected={row.selectedCopyCount > 0}
                data-selected-exact-allele={row.selectedCopyCount > 0 ? 'true' : 'false'}
                aria-label={`${row.label}; ${row.selectedCopyCount} selected exact-allele copies`}
              >
                <strong>{row.label}</strong>
                <span>{row.representedCopyCount} represented copies</span>
                <span>
                  Selected: {row.selectedCopyCount}/{row.representedCopyCount} (
                  {Math.round(row.selectedFraction * 100)}%)
                </span>
              </ClusterSummary>
              <StripStack
                aria-label={`${row.label}: ${row.assignmentStatus} observed exact target assignments`}
              >
                {boundedRowExactAlleleIds(row.exactAlleleIds, selectedExactId).displayed.map(
                  (exactId) => (
                    <ExactSequenceStrip
                      key={exactId}
                      allele={alleleByExactId.get(exactId)}
                      exactId={exactId}
                      motifs={locus.motifs}
                      selected={exactId === selectedExactId}
                      precomputedDecomposition={decompositionByExactId.get(exactId) || null}
                    />
                  )
                )}
                {row.exactAlleleIds.length === 0 && (
                  <span>Target assignment unavailable; absence is not rendered as REF.</span>
                )}
                {boundedRowExactAlleleIds(row.exactAlleleIds, selectedExactId).omitted.length >
                  0 && (
                  <details>
                    <summary>
                      +
                      {boundedRowExactAlleleIds(row.exactAlleleIds, selectedExactId).omitted.length}{' '}
                      additional exact allele identities omitted from the compact band
                    </summary>
                    <ul>
                      {boundedRowExactAlleleIds(row.exactAlleleIds, selectedExactId).omitted.map(
                        (exactId) => (
                          <li key={exactId}>
                            <code>{exactAlleleLabel(alleleByExactId.get(exactId), exactId)}</code> (
                            <code>{exactId}</code>)
                          </li>
                        )
                      )}
                    </ul>
                  </details>
                )}
              </StripStack>
              <span>
                {
                  {
                    mixed: 'Different observed assignment vectors; no consensus',
                    homogeneous: 'One observed assignment vector',
                    partial: `${row.unknownCopyCount} represented copies have unknown target assignment; absence is not REF`,
                    unassigned: 'No deterministic assignment',
                  }[row.assignmentStatus]
                }
              </span>
            </TargetRow>
          ))}
        </TargetRows>

        {representedSuperpopulations.length > 0 && (
          <Legend aria-label="Genetic ancestry colors">
            {representedSuperpopulations.map((population) => (
              <LegendKey key={population}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    background: SUPERPOPULATION_COLORS[population] || SUPERPOPULATION_COLORS['N/A'],
                  }}
                />
                {population}
              </LegendKey>
            ))}
          </Legend>
        )}

        <ViewerShell aria-label="Fixed, contig-clipped ±50 kb local flanking haplotype view">
          <React.Suspense fallback={<p role="status">Loading local haplotype track…</p>}>
            <LocalHaplotypeTrack
              mapper={accordionMapper}
              window={descriptor.fixed_window}
              width={viewerWidth}
              height={Math.min(500, Math.max(180, rows.length * 35 + 40))}
              groups={haplotypeGroups}
              clusters={data.clusters || []}
              treeJson={data.tree_json}
              metadata={metadata}
              resolution={resolution}
              onResolutionChange={changeResolution}
              expandedClusterIds={expandedClusterIds}
              onToggleClusterExpansion={toggleClusterExpansion}
              targetOverlay={targetTrackOverlay}
            />
          </React.Suspense>
        </ViewerShell>
      </>
    </Panel>
  )
}

export default LocalHaplotypeBackgroundsSection
