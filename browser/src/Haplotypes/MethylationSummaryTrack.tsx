import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'
import MethylationEvidenceCard, { type MethylationSelection } from './MethylationEvidenceCard'
import MethylationSupportBadge from './MethylationSupportBadge'
import MethylationViewControls from './MethylationViewControls'
import { classifyPopulationSupport } from './methylationSupport'
import { aggregateMethylationByVisualGroups } from './methylationGroupAggregation'
import {
  buildMethylationVisualGroups,
  type MethylationVisualGroup,
} from './methylationVisualGroups'
import type { MethylationSummaryPoint, MethylationViewMode } from './methylationTypes'

/* TooltipAnchor's API requires component factories at each data mark. */
/* eslint-disable react/no-unstable-nested-components */

const Container = styled.section`
  min-width: 0;
  border: 1px solid #dfe3e6;
  border-radius: 6px;
  overflow: hidden;

  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
`

const Left = styled.div`
  display: flex;
  align-items: flex-start;
  height: 100%;
`

const Plot = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  height: 100%;
`

const AttributeList = styled.dl`
  margin: 0;
  div {
    margin-bottom: 0.25em;
  }
  dt {
    display: inline;
    font-weight: 600;
  }
  dd {
    display: inline;
    margin-left: 0.5em;
  }
`

const finite = (value: number | null | undefined): value is number => Number.isFinite(value)

const sortedSummary = (summary: readonly MethylationSummaryPoint[]) =>
  [...summary].sort(
    (a, b) =>
      a.chrom.localeCompare(b.chrom) ||
      (finite(a.pos1) ? a.pos1 : Number.POSITIVE_INFINITY) -
        (finite(b.pos1) ? b.pos1 : Number.POSITIVE_INFINITY) ||
      (finite(a.pos2) ? a.pos2 : Number.POSITIVE_INFINITY) -
        (finite(b.pos2) ? b.pos2 : Number.POSITIVE_INFINITY)
  )

/** Coordinate-ordered mean runs. Missing means, malformed records, chromosomes, and >1 kb gaps split. */
export const buildMethylationMeanRuns = (
  summary: readonly MethylationSummaryPoint[]
): MethylationSummaryPoint[][] => {
  const runs: MethylationSummaryPoint[][] = []
  let current: MethylationSummaryPoint[] = []
  const flush = () => {
    if (current.length > 0) runs.push(current)
    current = []
  }

  sortedSummary(summary).forEach((site) => {
    if (
      !finite(site.pos1) ||
      !finite(site.pos2) ||
      site.pos2 < site.pos1 ||
      !finite(site.mean_methylation)
    ) {
      flush()
      return
    }
    const previous = current[current.length - 1]
    if (previous && (site.chrom !== previous.chrom || site.pos1 - previous.pos1 > 1000)) {
      flush()
    }
    current.push(site)
  })
  flush()
  return runs
}

/** SD ribbons are stricter than mean runs: every missing SD starts a visible ribbon gap. */
export const buildMethylationSdRuns = (
  summary: readonly MethylationSummaryPoint[]
): MethylationSummaryPoint[][] =>
  buildMethylationMeanRuns(summary).flatMap((meanRun) => {
    const sdRuns: MethylationSummaryPoint[][] = []
    let current: MethylationSummaryPoint[] = []
    const flush = () => {
      if (current.length > 0) sdRuns.push(current)
      current = []
    }
    meanRun.forEach((site) => {
      if (!finite(site.std_methylation)) flush()
      else current.push(site)
    })
    flush()
    return sdRuns
  })

const persistedMode = (): MethylationViewMode => {
  try {
    const value = window.sessionStorage.getItem('gnomad-lr-methylation-view')
    return value === 'groups' || value === 'both' ? value : 'sites'
  } catch (_) {
    return 'sites'
  }
}

const selectionKey = (selection: MethylationSelection) =>
  selection.kind === 'group'
    ? `group:${selection.group.key}`
    : `site:${selection.site.chrom}:${selection.site.pos1}:${selection.site.pos2}`

type LowerLayerMethylation = {
  pos1: number
  pos2: number
  methylation: number
  coverage?: number | null
  sample?: string
  sampleCount?: number
}

export const MethylationSummaryTrack = ({
  methylationSummary,
  viewMode: controlledViewMode,
  onViewModeChange,
  visualGroups,
  sampleTotalMethylation = [],
  copyMethylation,
  copyEvidenceAvailable = false,
}: {
  methylationSummary: MethylationSummaryPoint[]
  viewMode?: MethylationViewMode
  onViewModeChange?: (mode: MethylationViewMode) => void
  visualGroups?: MethylationVisualGroup[]
  sampleTotalMethylation?: LowerLayerMethylation[]
  copyMethylation?: { A: LowerLayerMethylation[]; B: LowerLayerMethylation[] }
  copyEvidenceAvailable?: boolean
}) => {
  const height = 130
  const containerRef = useRef<HTMLElement | null>(null)
  const [internalViewMode, setInternalViewMode] = useState<MethylationViewMode>(persistedMode)
  const viewMode = controlledViewMode ?? internalViewMode
  const [selection, setSelection] = useState<MethylationSelection | null>(null)
  const [selectedMarkKey, setSelectedMarkKey] = useState<string | null>(null)
  const [activeMarkIndex, setActiveMarkIndex] = useState(0)
  const computedGroups = useMemo(
    () => buildMethylationVisualGroups(methylationSummary),
    [methylationSummary]
  )
  const groups = visualGroups ?? computedGroups
  const validGroupingSiteCount = methylationSummary.filter(
    (site) =>
      finite(site.mean_methylation) &&
      finite(site.pos1) &&
      finite(site.pos2) &&
      site.pos1 >= 0 &&
      site.pos2 >= site.pos1
  ).length
  const groupOutputLimitExceeded = groups.length === 0 && validGroupingSiteCount > 0
  const sampleTotalGroups = useMemo(
    () => aggregateMethylationByVisualGroups(sampleTotalMethylation, groups, 'sample-total'),
    [groups, sampleTotalMethylation]
  )
  // Keep admitted observations raw through the selected-card path. Reconstructing observations
  // from one collapsed CpG mean would lose total coverage when CpGs have unequal sample counts.
  const copyAGroups = useMemo(
    () => aggregateMethylationByVisualGroups(copyMethylation?.A ?? [], groups, 'copy'),
    [copyMethylation?.A, groups]
  )
  const copyBGroups = useMemo(
    () => aggregateMethylationByVisualGroups(copyMethylation?.B ?? [], groups, 'copy'),
    [copyMethylation?.B, groups]
  )
  const sortedSites = useMemo(() => sortedSummary(methylationSummary), [methylationSummary])
  const meanRuns = useMemo(() => buildMethylationMeanRuns(methylationSummary), [methylationSummary])
  const sdRuns = useMemo(() => buildMethylationSdRuns(methylationSummary), [methylationSummary])
  const scopeKey = useMemo(
    () =>
      sortedSites
        .map(
          (site) =>
            `${site.chrom}:${site.pos1}:${site.pos2}:${site.mean_methylation}:${site.std_methylation}:${site.mean_coverage}:${site.num_samples}`
        )
        .join('|'),
    [sortedSites]
  )
  const previousScopeKey = useRef(scopeKey)

  useEffect(() => {
    if (previousScopeKey.current !== scopeKey) {
      previousScopeKey.current = scopeKey
      setSelection(null)
      setSelectedMarkKey(null)
      setActiveMarkIndex(0)
    }
  }, [scopeKey])

  const showSites = viewMode === 'sites' || viewMode === 'both'
  const showGroups = viewMode === 'groups' || viewMode === 'both'
  const marks = useMemo(() => {
    const visible: Array<{ key: string; position: number; kind: 'site' | 'group' }> = []
    if (showSites) {
      sortedSites.forEach((site) => {
        if (finite(site.pos1)) {
          visible.push({
            key: `site:${site.chrom}:${site.pos1}:${site.pos2}`,
            position: site.pos1,
            kind: 'site',
          })
        }
      })
    }
    if (showGroups) {
      groups.forEach((group) => {
        visible.push({ key: `group:${group.key}`, position: group.start, kind: 'group' })
      })
    }
    return visible.sort(
      (a, b) =>
        a.position - b.position || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key)
    )
  }, [groups, showGroups, showSites, sortedSites])
  const markIndexByKey = useMemo(
    () => new Map(marks.map((mark, index) => [mark.key, index])),
    [marks]
  )

  useEffect(() => {
    if (activeMarkIndex >= marks.length) setActiveMarkIndex(Math.max(0, marks.length - 1))
  }, [activeMarkIndex, marks.length])

  const applyViewMode = (mode: MethylationViewMode) => {
    if (controlledViewMode === undefined) setInternalViewMode(mode)
    onViewModeChange?.(mode)
    try {
      window.sessionStorage.setItem('gnomad-lr-methylation-view', mode)
    } catch (_) {
      // Storage is optional.
    }
  }

  const setViewMode = (mode: MethylationViewMode) => {
    applyViewMode(mode)
    setActiveMarkIndex(0)
    if (
      selection &&
      ((selection.kind === 'site' && mode === 'groups') ||
        (selection.kind === 'group' && mode === 'sites'))
    ) {
      setSelection(null)
      setSelectedMarkKey(null)
    }
  }

  const switchSelectedGroupToSites = () => {
    if (selection?.kind !== 'group') {
      setViewMode('sites')
      return
    }
    const constituent = [...selection.group.sites].sort(
      (a, b) => a.chrom.localeCompare(b.chrom) || a.pos1 - b.pos1 || a.pos2 - b.pos2
    )[0]
    if (!constituent) {
      setViewMode('sites')
      return
    }
    const siteKey = `site:${constituent.chrom}:${constituent.pos1}:${constituent.pos2}`
    const siteIndex = sortedSites.findIndex(
      (site) =>
        site.chrom === constituent.chrom &&
        site.pos1 === constituent.pos1 &&
        site.pos2 === constituent.pos2
    )
    applyViewMode('sites')
    setSelection({ kind: 'site', site: constituent })
    setSelectedMarkKey(siteKey)
    setActiveMarkIndex(Math.max(0, siteIndex))
    window.setTimeout(() => {
      containerRef.current
        ?.querySelector<SVGGElement>(`[data-methylation-mark-index="${Math.max(0, siteIndex)}"]`)
        ?.focus()
    }, 0)
  }

  const choose = (nextSelection: MethylationSelection) => {
    setSelection(nextSelection)
    setSelectedMarkKey(selectionKey(nextSelection))
  }

  const moveFocus = (event: React.KeyboardEvent<SVGGElement>, nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(marks.length - 1, nextIndex))
    setActiveMarkIndex(boundedIndex)
    const svg = event.currentTarget.ownerSVGElement
    const next = svg?.querySelector<SVGGElement>(`[data-methylation-mark-index="${boundedIndex}"]`)
    next?.focus()
  }

  const handleMarkKeyDown = (
    event: React.KeyboardEvent<SVGGElement>,
    index: number,
    nextSelection: MethylationSelection
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(nextSelection)
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(event, index + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(event, index - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      moveFocus(event, 0)
    } else if (event.key === 'End') {
      event.preventDefault()
      moveFocus(event, marks.length - 1)
    }
  }

  const closeEvidence = () => {
    const index = selectedMarkKey == null ? undefined : markIndexByKey.get(selectedMarkKey)
    setSelection(null)
    if (index === undefined) return
    setActiveMarkIndex(index)
    window.setTimeout(() => {
      containerRef.current
        ?.querySelector<SVGGElement>(`[data-methylation-mark-index="${index}"]`)
        ?.focus()
    }, 0)
  }

  return (
    <Container ref={containerRef} aria-label="Population methylation context">
      <MethylationViewControls value={viewMode} onChange={setViewMode} />
      {groups.length === 0 && groupOutputLimitExceeded && (
        <p style={{ margin: '0 12px 8px', fontSize: 11, color: '#555' }}>
          CpG group overlay unavailable: this fetched viewport cannot satisfy both the 200-CpG
          object cap and the 200-group interaction cap. CpG sites remain available without a partial
          or over-cap grouping claim.
        </p>
      )}
      <Track
        renderLeftPanel={() => (
          <Left>
            <svg width={200} height={height} aria-hidden="true">
              <g transform="translate(110, 5)">
                <text x={-70} y={58} fontSize="9" textAnchor="middle" fill="#666">
                  Population (%)
                </text>
                <line x1={0} y1={0} x2={0} y2={115} stroke="black" />
                {[0, 50, 100].map((tick) => (
                  <g transform={`translate(0, ${115 - (tick / 100) * 115})`} key={tick}>
                    <line x1={-5} y1={0} x2={0} y2={0} stroke="black" />
                    <text x={-10} y={3} fontSize="10" textAnchor="end">
                      {tick}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </Left>
        )}
      >
        {({
          scalePosition,
          width,
        }: {
          scalePosition: (input: number) => number
          width: number
        }) => {
          const y = scaleLinear().domain([0, 100]).range([120, 5])
          return (
            <Plot>
              <svg
                height={height}
                width={width}
                role="group"
                aria-label={`Population methylation context. ${groups.length} visual groups. Use arrow keys to move between visible marks and Enter or Space to select.`}
              >
                <rect width={width} height={height} fill="#fafafa" />
                {[0, 50, 100].map((tick) => (
                  <line key={tick} x1={0} y1={y(tick)} x2={width} y2={y(tick)} stroke="#e8e8e8" />
                ))}
                {showGroups &&
                  groups.map((group) => {
                    const groupSupportLimited = group.limitedSupportSites > 0
                    const x1 = scalePosition(group.start)
                    const x2 = scalePosition(group.stop)
                    const key = `group:${group.key}`
                    const markIndex = markIndexByKey.get(key) ?? -1
                    return (
                      <TooltipAnchor
                        key={group.key}
                        tooltipComponent={() => (
                          <AttributeList>
                            <div>
                              <dt>Visual CpG group:</dt>
                              <dd>
                                {group.chrom}:{group.start.toLocaleString()}–
                                {group.stop.toLocaleString()}
                              </dd>
                            </div>
                            <div>
                              <dt>CpGs:</dt>
                              <dd>{group.siteCount}</dd>
                            </div>
                            <div>
                              <dt>Median population mean:</dt>
                              <dd>{group.medianPopulationMean.toFixed(1)}%</dd>
                            </div>
                            <div>
                              <dt>Site-mean range:</dt>
                              <dd>
                                {group.minimumSiteMean.toFixed(1)}%–
                                {group.maximumSiteMean.toFixed(1)}%
                              </dd>
                            </div>
                            <div>
                              <dt>Median mean depth:</dt>
                              <dd>{group.medianMeanCoverage?.toFixed(1) ?? 'Unavailable'}×</dd>
                            </div>
                            <div>
                              <dt>Observed sample totals:</dt>
                              <dd>
                                median {group.medianObservedSamples}; minimum{' '}
                                {group.minimumObservedSamples}
                              </dd>
                            </div>
                            <div>
                              <dt>Display method:</dt>
                              <dd>
                                {group.method}; {group.configurationVersion}
                              </dd>
                            </div>
                          </AttributeList>
                        )}
                      >
                        <g
                          role="button"
                          tabIndex={markIndex === activeMarkIndex ? 0 : -1}
                          data-methylation-mark-index={markIndex}
                          data-methylation-mark-key={key}
                          aria-label={`Select methylation visual CpG group ${group.start} to ${group.stop}`}
                          onFocus={() => setActiveMarkIndex(markIndex)}
                          onClick={() => choose({ kind: 'group', group })}
                          onKeyDown={(event) =>
                            handleMarkKeyDown(event, markIndex, { kind: 'group', group })
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          <rect
                            x={x1}
                            y={y(group.maximumSiteMean)}
                            width={Math.max(2, x2 - x1)}
                            height={Math.max(
                              2,
                              y(group.minimumSiteMean) - y(group.maximumSiteMean)
                            )}
                            fill="#7aa6c2"
                            fillOpacity={viewMode === 'both' ? 0.16 : 0.28}
                            stroke="#2a6f97"
                            strokeDasharray={groupSupportLimited ? '4 3' : undefined}
                          />
                          <line
                            x1={x1}
                            x2={Math.max(x1 + 2, x2)}
                            y1={y(group.medianPopulationMean)}
                            y2={y(group.medianPopulationMean)}
                            stroke="#2a6f97"
                            strokeWidth={2}
                          />
                        </g>
                      </TooltipAnchor>
                    )
                  })}
                {showSites && (
                  <>
                    {sdRuns.map((run) => {
                      if (run.length < 2) return null
                      const upper = run.map(
                        (site) =>
                          `${scalePosition(site.pos1)},${y(
                            Math.min(100, site.mean_methylation + site.std_methylation!)
                          )}`
                      )
                      const lower = [...run]
                        .reverse()
                        .map(
                          (site) =>
                            `${scalePosition(site.pos1)},${y(
                              Math.max(0, site.mean_methylation - site.std_methylation!)
                            )}`
                        )
                      return (
                        <polygon
                          key={`variability-${run[0].chrom}-${run[0].pos1}`}
                          points={[...upper, ...lower].join(' ')}
                          fill="#5b6fa8"
                          fillOpacity={0.1}
                          aria-hidden="true"
                        />
                      )
                    })}
                    {sortedSites.map((site) => {
                      if (!finite(site.mean_methylation) || !finite(site.std_methylation)) {
                        return null
                      }
                      const support = classifyPopulationSupport(site)
                      const x = scalePosition(site.pos1)
                      return (
                        <line
                          key={`sd-${site.chrom}-${site.pos1}`}
                          x1={x}
                          x2={x}
                          y1={y(Math.min(100, site.mean_methylation + site.std_methylation))}
                          y2={y(Math.max(0, site.mean_methylation - site.std_methylation))}
                          stroke="#5b6fa8"
                          strokeOpacity={support.state === 'adequate' ? 0.24 : 0.12}
                          strokeWidth={2}
                        />
                      )
                    })}
                    {meanRuns.map((run) => (
                      <polyline
                        key={`mean-${run[0].chrom}-${run[0].pos1}`}
                        points={run
                          .map((site) => `${scalePosition(site.pos1)},${y(site.mean_methylation)}`)
                          .join(' ')}
                        fill="none"
                        stroke="#394b59"
                        strokeWidth={1}
                        strokeOpacity={0.7}
                      />
                    ))}
                    {sortedSites.map((site) => {
                      if (!finite(site.pos1)) return null
                      const support = classifyPopulationSupport(site)
                      const x = scalePosition(site.pos1)
                      const meanAvailable = finite(site.mean_methylation)
                      const sdAvailable = finite(site.std_methylation)
                      const markY = meanAvailable ? y(site.mean_methylation) : height / 2
                      const key = `site:${site.chrom}:${site.pos1}:${site.pos2}`
                      const markIndex = markIndexByKey.get(key) ?? -1
                      return (
                        <TooltipAnchor
                          key={`${site.chrom}-${site.pos1}-${site.pos2}`}
                          tooltipComponent={() => (
                            <AttributeList>
                              <div>
                                <dt>Coordinate:</dt>
                                <dd>
                                  {site.chrom}:{site.pos1.toLocaleString()}
                                </dd>
                              </div>
                              <div>
                                <dt>Population mean:</dt>
                                <dd>
                                  {meanAvailable
                                    ? `${site.mean_methylation.toFixed(1)}%`
                                    : 'Unavailable'}
                                </dd>
                              </div>
                              <div>
                                <dt>Population variability (site SD):</dt>
                                <dd>
                                  {sdAvailable
                                    ? `${site.std_methylation!.toFixed(1)}%`
                                    : 'Unavailable — ribbon is gapped'}
                                </dd>
                              </div>
                              <div>
                                <dt>Range:</dt>
                                <dd>
                                  {site.min_methylation == null || site.max_methylation == null
                                    ? 'Unavailable'
                                    : `${site.min_methylation.toFixed(
                                        1
                                      )}%–${site.max_methylation.toFixed(1)}%`}
                                </dd>
                              </div>
                              <div>
                                <dt>Mean read depth:</dt>
                                <dd>{site.mean_coverage.toFixed(1)}×</dd>
                              </div>
                              <div>
                                <dt>Observed sample totals:</dt>
                                <dd>{site.num_samples}</dd>
                              </div>
                              <div>
                                <dt>Display support:</dt>
                                <dd>
                                  <MethylationSupportBadge
                                    state={support.state}
                                    reasons={support.reasons}
                                  />
                                </dd>
                              </div>
                            </AttributeList>
                          )}
                        >
                          <g
                            role="button"
                            tabIndex={markIndex === activeMarkIndex ? 0 : -1}
                            data-methylation-mark-index={markIndex}
                            data-methylation-mark-key={key}
                            aria-label={`Select CpG site ${site.pos1}. Population mean ${
                              meanAvailable
                                ? `${site.mean_methylation.toFixed(1)} percent`
                                : 'unavailable'
                            }; site SD ${
                              sdAvailable
                                ? `${site.std_methylation!.toFixed(1)} percent`
                                : 'unavailable'
                            }.`}
                            onFocus={() => setActiveMarkIndex(markIndex)}
                            onClick={() => choose({ kind: 'site', site })}
                            onKeyDown={(event) =>
                              handleMarkKeyDown(event, markIndex, { kind: 'site', site })
                            }
                            style={{ cursor: 'pointer' }}
                          >
                            {!meanAvailable ? (
                              <>
                                <circle
                                  cx={x}
                                  cy={markY}
                                  r={6}
                                  fill="#fff"
                                  stroke="#8a4b08"
                                  strokeDasharray="2 2"
                                />
                                <text
                                  x={x}
                                  y={markY + 3}
                                  textAnchor="middle"
                                  fontSize={9}
                                  fill="#8a4b08"
                                  aria-hidden="true"
                                >
                                  ?
                                </text>
                              </>
                            ) : (
                              <>
                                {!sdAvailable && (
                                  <path
                                    d={`M ${x - 4} ${markY - 4} L ${x + 4} ${markY + 4} M ${
                                      x + 4
                                    } ${markY - 4} L ${x - 4} ${markY + 4}`}
                                    stroke="#8a4b08"
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                  />
                                )}
                                <circle
                                  cx={x}
                                  cy={markY}
                                  r={support.state === 'adequate' ? 3 : 4}
                                  fill={support.state === 'adequate' ? '#394b59' : '#fff'}
                                  stroke={support.state === 'adequate' ? '#394b59' : '#8a4b08'}
                                  strokeWidth={support.state === 'adequate' ? 1 : 2}
                                />
                              </>
                            )}
                          </g>
                        </TooltipAnchor>
                      )
                    })}
                  </>
                )}
              </svg>
            </Plot>
          )
        }}
      </Track>
      {selection && (
        <MethylationEvidenceCard
          key={selectionKey(selection)}
          selection={selection}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSwitchToSites={switchSelectedGroupToSites}
          onClose={closeEvidence}
          sampleTotalGroup={
            selection.kind === 'group'
              ? sampleTotalGroups.find((summary) => summary.group.key === selection.group.key)
              : null
          }
          copyAGroup={
            selection.kind === 'group'
              ? copyAGroups.find((summary) => summary.group.key === selection.group.key)
              : null
          }
          copyBGroup={
            selection.kind === 'group'
              ? copyBGroups.find((summary) => summary.group.key === selection.group.key)
              : null
          }
          copyEvidenceAvailable={copyEvidenceAvailable}
        />
      )}
    </Container>
  )
}

export default MethylationSummaryTrack
