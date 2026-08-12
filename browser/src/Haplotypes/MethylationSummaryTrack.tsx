import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'
import MethylationEvidenceCard, { type MethylationSelection } from './MethylationEvidenceCard'
import MethylationSupportBadge from './MethylationSupportBadge'
import MethylationViewControls from './MethylationViewControls'
import { classifyPopulationSupport } from './methylationSupport'
import { buildMethylationVisualGroups } from './methylationVisualGroups'
import type { MethylationSummaryPoint, MethylationViewMode } from './methylationTypes'

/* TooltipAnchor's API requires component factories at each data mark. */
/* eslint-disable react/no-unstable-nested-components */

const Container = styled.section`
  min-width: 0;
  border: 1px solid #dfe3e6;
  border-radius: 6px;
  overflow: hidden;

  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
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
  div { margin-bottom: 0.25em; }
  dt { display: inline; font-weight: 600; }
  dd { display: inline; margin-left: 0.5em; }
`

const persistedMode = (): MethylationViewMode => {
  try {
    const value = window.sessionStorage.getItem('gnomad-lr-methylation-view')
    return value === 'groups' || value === 'both' ? value : 'sites'
  } catch (_) {
    return 'sites'
  }
}

export const MethylationSummaryTrack = ({
  methylationSummary,
}: {
  methylationSummary: MethylationSummaryPoint[]
}) => {
  const height = 130
  const [viewMode, setViewModeState] = useState<MethylationViewMode>(persistedMode)
  const [selection, setSelection] = useState<MethylationSelection | null>(null)
  const groups = useMemo(() => buildMethylationVisualGroups(methylationSummary), [methylationSummary])
  const sortedSites = useMemo(
    () => [...methylationSummary].sort((a, b) => a.chrom.localeCompare(b.chrom) || a.pos1 - b.pos1),
    [methylationSummary]
  )

  const setViewMode = (mode: MethylationViewMode) => {
    setViewModeState(mode)
    try { window.sessionStorage.setItem('gnomad-lr-methylation-view', mode) } catch (_) { /* storage is optional */ }
  }
  const showSites = viewMode === 'sites' || viewMode === 'both'
  const showGroups = viewMode === 'groups' || viewMode === 'both'

  return (
    <Container aria-label="Population methylation context">
      <MethylationViewControls value={viewMode} onChange={setViewMode} />
      <p style={{ margin: '0 12px 8px', fontSize: 11, color: '#555' }}>
        {groups.length} browser-derived visual CpG group{groups.length === 1 ? '' : 's'} in this display.
        Groups are recalculated for the displayed region and are not biological events.
      </p>
      <Track
        renderLeftPanel={() => (
          <Left>
            <svg width={200} height={height} aria-hidden="true">
              <g transform="translate(110, 5)">
                <text x={-70} y={58} fontSize="9" textAnchor="middle" fill="#666">Population (%)</text>
                <line x1={0} y1={0} x2={0} y2={115} stroke="black" />
                {[0, 50, 100].map((tick) => (
                  <g transform={`translate(0, ${115 - (tick / 100) * 115})`} key={tick}>
                    <line x1={-5} y1={0} x2={0} y2={0} stroke="black" />
                    <text x={-10} y={3} fontSize="10" textAnchor="end">{tick}</text>
                  </g>
                ))}
              </g>
            </svg>
          </Left>
        )}
      >
        {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => {
          const y = scaleLinear().domain([0, 100]).range([120, 5])
          const meanPolyline = sortedSites.map((site) => `${scalePosition(site.pos1)},${y(site.mean_methylation)}`).join(' ')
          return (
            <Plot>
              <svg
                height={height}
                width={width}
                role="img"
                tabIndex={0}
                aria-label={`Population methylation context. ${groups.length} visual groups. ${selection ? 'An evidence object is selected.' : 'No evidence object selected.'}`}
              >
                <rect width={width} height={height} fill="#fafafa" />
                {[0, 50, 100].map((tick) => <line key={tick} x1={0} y1={y(tick)} x2={width} y2={y(tick)} stroke="#e8e8e8" />)}
                {showGroups && groups.map((group) => {
                  const groupSupportLimited = group.limitedSupportSites > 0
                  const x1 = scalePosition(group.start)
                  const x2 = scalePosition(group.stop)
                  return (
                    <TooltipAnchor
                      key={group.key}
                      tooltipComponent={() => (
                        <AttributeList>
                          <div><dt>Visual CpG group:</dt><dd>{group.chrom}:{group.start.toLocaleString()}–{group.stop.toLocaleString()}</dd></div>
                          <div><dt>CpGs:</dt><dd>{group.siteCount}</dd></div>
                          <div><dt>Median population mean:</dt><dd>{group.medianPopulationMean.toFixed(1)}%</dd></div>
                          <div><dt>Site-mean range:</dt><dd>{group.minimumSiteMean.toFixed(1)}%–{group.maximumSiteMean.toFixed(1)}%</dd></div>
                          <div><dt>Median mean depth:</dt><dd>{group.medianMeanCoverage?.toFixed(1) ?? 'Unavailable'}×</dd></div>
                          <div><dt>Observed sample totals:</dt><dd>median {group.medianObservedSamples}; minimum {group.minimumObservedSamples}</dd></div>
                          <div><dt>Display method:</dt><dd>{group.method}; {group.configurationVersion}</dd></div>
                        </AttributeList>
                      )}
                    >
                      <g
                        role="button"
                        tabIndex={0}
                        aria-label={`Select visual CpG group ${group.start} to ${group.stop}`}
                        onClick={() => setSelection({ kind: 'group', group })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') setSelection({ kind: 'group', group })
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={x1}
                          y={y(group.maximumSiteMean)}
                          width={Math.max(2, x2 - x1)}
                          height={Math.max(2, y(group.minimumSiteMean) - y(group.maximumSiteMean))}
                          fill="#7aa6c2"
                          fillOpacity={viewMode === 'both' ? 0.16 : 0.28}
                          stroke="#2a6f97"
                          strokeDasharray={groupSupportLimited ? '4 3' : undefined}
                        />
                        <line x1={x1} x2={Math.max(x1 + 2, x2)} y1={y(group.medianPopulationMean)} y2={y(group.medianPopulationMean)} stroke="#2a6f97" strokeWidth={2} />
                      </g>
                    </TooltipAnchor>
                  )
                })}
                {showSites && (
                  <>
                    {groups.map((group) => {
                      const upper = group.sites.map((site) => {
                        const sd = site.std_methylation ?? 0
                        return `${scalePosition(site.pos1)},${y(Math.min(100, site.mean_methylation + sd))}`
                      })
                      const lower = [...group.sites].reverse().map((site) => {
                        const sd = site.std_methylation ?? 0
                        return `${scalePosition(site.pos1)},${y(Math.max(0, site.mean_methylation - sd))}`
                      })
                      return (
                        <polygon
                          key={`variability-${group.key}`}
                          points={[...upper, ...lower].join(' ')}
                          fill="#5b6fa8"
                          fillOpacity={0.1}
                          aria-hidden="true"
                        />
                      )
                    })}
                    {sortedSites.map((site) => {
                      const support = classifyPopulationSupport(site)
                      const sd = site.std_methylation
                      const x = scalePosition(site.pos1)
                      return sd == null ? null : (
                        <line
                          key={`sd-${site.chrom}-${site.pos1}`}
                          x1={x} x2={x}
                          y1={y(Math.min(100, site.mean_methylation + sd))}
                          y2={y(Math.max(0, site.mean_methylation - sd))}
                          stroke="#5b6fa8"
                          strokeOpacity={support.state === 'adequate' ? 0.24 : 0.12}
                          strokeWidth={2}
                        />
                      )
                    })}
                    <polyline points={meanPolyline} fill="none" stroke="#394b59" strokeWidth={1} strokeOpacity={0.7} />
                    {sortedSites.map((site) => {
                      const support = classifyPopulationSupport(site)
                      const x = scalePosition(site.pos1)
                      return (
                        <TooltipAnchor
                          key={`${site.chrom}-${site.pos1}-${site.pos2}`}
                          tooltipComponent={() => (
                            <AttributeList>
                              <div><dt>Coordinate:</dt><dd>{site.chrom}:{site.pos1.toLocaleString()}</dd></div>
                              <div><dt>Population mean:</dt><dd>{site.mean_methylation.toFixed(1)}%</dd></div>
                              <div><dt>Population variability (site SD):</dt><dd>{site.std_methylation == null ? 'Unavailable' : `${site.std_methylation.toFixed(1)}%`}</dd></div>
                              <div><dt>Range:</dt><dd>{site.min_methylation == null || site.max_methylation == null ? 'Unavailable' : `${site.min_methylation.toFixed(1)}%–${site.max_methylation.toFixed(1)}%`}</dd></div>
                              <div><dt>Mean read depth:</dt><dd>{site.mean_coverage.toFixed(1)}×</dd></div>
                              <div><dt>Observed sample totals:</dt><dd>{site.num_samples}</dd></div>
                              <div><dt>Display support:</dt><dd><MethylationSupportBadge state={support.state} reasons={support.reasons} /></dd></div>
                            </AttributeList>
                          )}
                        >
                          <circle
                            cx={x}
                            cy={y(site.mean_methylation)}
                            r={support.state === 'adequate' ? 3 : 4}
                            fill={support.state === 'adequate' ? '#394b59' : '#fff'}
                            stroke={support.state === 'adequate' ? '#394b59' : '#8a4b08'}
                            strokeWidth={support.state === 'adequate' ? 1 : 2}
                            onClick={() => setSelection({ kind: 'site', site })}
                            style={{ cursor: 'pointer' }}
                          />
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
      {selection && <MethylationEvidenceCard selection={selection} viewMode={viewMode} onViewModeChange={setViewMode} />}
    </Container>
  )
}

export default MethylationSummaryTrack
