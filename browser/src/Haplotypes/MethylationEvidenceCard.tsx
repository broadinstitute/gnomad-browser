import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { classifyCopySupport, classifyPopulationSupport } from './methylationSupport'
import type { MethylationLayerGroupSummary } from './methylationGroupAggregation'
import MethylationSupportBadge from './MethylationSupportBadge'
import type { MethylationSummaryPoint, MethylationViewMode } from './methylationTypes'
import type { MethylationVisualGroup } from './methylationVisualGroups'

export type MethylationSelection =
  | { kind: 'site'; site: MethylationSummaryPoint }
  | { kind: 'group'; group: MethylationVisualGroup }

const Card = styled.section`
  box-sizing: border-box;
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ccd4da;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;

  dl {
    display: grid;
    grid-template-columns: minmax(130px, 190px) minmax(0, 1fr);
    gap: 4px 10px;
    margin: 8px 0;
  }

  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
  }

  .table-scroll {
    max-width: 100%;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 5px 8px;
    border-bottom: 1px solid #ddd;
    text-align: right;
  }
  th:first-child,
  td:first-child {
    text-align: left;
  }
  button {
    min-height: 44px;
    margin-right: 8px;
  }

  @media (max-width: 390px) {
    border-radius: 0;
    dl {
      grid-template-columns: 1fr;
    }
  }
`

const percent = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? 'Unavailable' : `${value.toFixed(1)}%`
const depth = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? 'Unavailable' : `${value.toFixed(1)}×`

export const MethylationEvidenceCard = ({
  selection,
  viewMode,
  onViewModeChange,
  onSwitchToSites,
  onClose,
  sampleTotalGroup,
  copyAGroup,
  copyBGroup,
  copyEvidenceAvailable = false,
}: {
  selection: MethylationSelection
  viewMode: MethylationViewMode
  onViewModeChange: (mode: MethylationViewMode) => void
  onSwitchToSites?: () => void
  onClose: () => void
  sampleTotalGroup?: MethylationLayerGroupSummary | null
  copyAGroup?: MethylationLayerGroupSummary | null
  copyBGroup?: MethylationLayerGroupSummary | null
  copyEvidenceAvailable?: boolean
}) => {
  const cardRef = useRef<HTMLElement | null>(null)
  const [showSites, setShowSites] = useState(selection.kind === 'site')
  useEffect(() => cardRef.current?.focus(), [])
  const sites = selection.kind === 'site' ? [selection.site] : selection.group.sites
  const region =
    selection.kind === 'site'
      ? `${selection.site.chrom}:${selection.site.pos1.toLocaleString()}`
      : `${
          selection.group.chrom
        }:${selection.group.start.toLocaleString()}–${selection.group.stop.toLocaleString()}`
  const representative = selection.kind === 'site' ? selection.site : null
  const group = selection.kind === 'group' ? selection.group : null
  const support = representative ? classifyPopulationSupport(representative) : null
  const showCopyEvidence = copyEvidenceAvailable || Boolean(copyAGroup) || Boolean(copyBGroup)
  const copySupport =
    group && showCopyEvidence
      ? classifyCopySupport(
          copyAGroup
            ? {
                medianDepth: copyAGroup.medianPerCpgCoverage,
                representedSites: copyAGroup.representedSites,
                totalSites: copyAGroup.group.siteCount,
                sampleCount: copyAGroup.contributingSampleCount,
              }
            : null,
          copyBGroup
            ? {
                medianDepth: copyBGroup.medianPerCpgCoverage,
                representedSites: copyBGroup.representedSites,
                totalSites: copyBGroup.group.siteCount,
                sampleCount: copyBGroup.contributingSampleCount,
              }
            : null,
          copyEvidenceAvailable
        )
      : null

  return (
    <Card ref={cardRef} tabIndex={-1} aria-live="polite" aria-label="Methylation context evidence">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Methylation context</h3>
        <button type="button" onClick={onClose} aria-label="Close methylation evidence">
          Close
        </button>
      </div>
      <dl>
        <dt>Region</dt>
        <dd>{region}</dd>
        <dt>View object</dt>
        <dd>{group ? `visual CpG group · ${group.siteCount} CpGs` : 'CpG site'}</dd>
        <dt>Population mean</dt>
        <dd>
          {group
            ? `median ${percent(group.medianPopulationMean)}`
            : percent(representative?.mean_methylation)}
        </dd>
        <dt>Site-mean range</dt>
        <dd>
          {group
            ? `${percent(group.minimumSiteMean)}–${percent(group.maximumSiteMean)}`
            : `${percent(representative?.min_methylation)}–${percent(
                representative?.max_methylation
              )}`}
        </dd>
        <dt>Mean read depth</dt>
        <dd>
          {group
            ? `median ${depth(group.medianMeanCoverage)}`
            : depth(representative?.mean_coverage)}
        </dd>
        <dt>Observed sample totals</dt>
        <dd>
          {group
            ? `median ${group.medianObservedSamples}; minimum ${group.minimumObservedSamples}`
            : representative?.num_samples ?? 'Unavailable'}
        </dd>
        {group && (
          <>
            <dt>Limited-support sites</dt>
            <dd>
              {group.limitedSupportSites}/{group.siteCount}
            </dd>
          </>
        )}
        {group && (
          <>
            <dt>Display grouping</dt>
            <dd>
              {group.method}; {group.configurationVersion}; boundary:{' '}
              {group.boundaryReason.replace(/-/g, ' ')}
            </dd>
          </>
        )}
        {support && (
          <>
            <dt>Display support</dt>
            <dd>
              <MethylationSupportBadge state={support.state} reasons={support.reasons} />
            </dd>
          </>
        )}
        {group && sampleTotalGroup && (
          <>
            <dt>Loaded sample-total group</dt>
            <dd>
              {percent(sampleTotalGroup.weightedMeanMethylation)} coverage-weighted mean; median
              depth {depth(sampleTotalGroup.medianPerCpgCoverage)};{' '}
              {sampleTotalGroup.representedSites}/{group.siteCount} CpGs represented;{' '}
              {sampleTotalGroup.missingSites} missing
            </dd>
          </>
        )}
        {group && copySupport && (
          <>
            <dt>Loaded Copy A</dt>
            <dd>
              {copyAGroup
                ? `${percent(
                    copyAGroup.weightedMeanMethylation
                  )} coverage-weighted mean; median depth ${depth(
                    copyAGroup.medianPerCpgCoverage
                  )}; ${copyAGroup.representedSites}/${group.siteCount} CpGs observed`
                : 'Unavailable — not displayed as 0%'}
            </dd>
            <dt>Loaded Copy B</dt>
            <dd>
              {copyBGroup
                ? `${percent(
                    copyBGroup.weightedMeanMethylation
                  )} coverage-weighted mean; median depth ${depth(
                    copyBGroup.medianPerCpgCoverage
                  )}; ${copyBGroup.representedSites}/${group.siteCount} CpGs observed`
                : 'Unavailable — not displayed as 0%'}
            </dd>
            <dt>Copy A/B support</dt>
            <dd>
              <MethylationSupportBadge state={copySupport.state} reasons={copySupport.reasons} />
            </dd>
          </>
        )}
        <dt>Source</dt>
        <dd>
          gnomAD-LR population summaries for the current cohort, run, and assembly; see Methylation
          context help for methods and provenance.
        </dd>
      </dl>
      <p>
        Population variation or a Copy A/B difference does not establish functional effect,
        imprinting, pathogenicity, or diagnosis. Visual groups are display aids, not biological
        events. Loaded sample-total and Copy A/B summaries use the same population boundaries; their
        coverage-weighted percentages are browser display summaries, not event calls.
      </p>
      {group && (
        <button
          type="button"
          onClick={() => setShowSites((value) => !value)}
          aria-expanded={showSites}
        >
          {showSites ? 'Hide constituent CpGs' : 'Show constituent CpGs'}
        </button>
      )}
      {viewMode !== 'sites' && (
        <button type="button" onClick={onSwitchToSites ?? (() => onViewModeChange('sites'))}>
          Switch to CpG sites
        </button>
      )}
      {showSites && (
        <div className="table-scroll">
          <table>
            <caption>Constituent CpG-site evidence (population summary)</caption>
            <thead>
              <tr>
                <th>Coordinate</th>
                <th>Mean</th>
                <th>SD</th>
                <th>Range</th>
                <th>Depth</th>
                <th>Samples</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={`${site.chrom}-${site.pos1}-${site.pos2}`}>
                  <td>
                    {site.chrom}:{site.pos1.toLocaleString()}
                  </td>
                  <td>{percent(site.mean_methylation)}</td>
                  <td>{percent(site.std_methylation)}</td>
                  <td>
                    {percent(site.min_methylation)}–{percent(site.max_methylation)}
                  </td>
                  <td>{depth(site.mean_coverage)}</td>
                  <td>{site.num_samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {group && sampleTotalGroup && sampleTotalGroup.sites.length > 0 && (
            <table>
              <caption>Loaded sample-total CpG marks in this visual group</caption>
              <thead>
                <tr>
                  <th>Coordinate</th>
                  <th>Weighted mean</th>
                  <th>Mean depth</th>
                  <th>Total coverage</th>
                  <th>Samples</th>
                </tr>
              </thead>
              <tbody>
                {sampleTotalGroup.sites.map((site) => (
                  <tr key={`total-${site.pos1}-${site.pos2}`}>
                    <td>
                      {group.chrom}:{site.pos1.toLocaleString()}
                    </td>
                    <td>{percent(site.weightedMeanMethylation)}</td>
                    <td>{depth(site.meanCoverage)}</td>
                    <td>{depth(site.totalCoverage)}</td>
                    <td>{site.contributingSampleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {group &&
            [copyAGroup, copyBGroup].map((copyGroup, index) => {
              const copy = index === 0 ? 'A' : 'B'
              if (!copyGroup || copyGroup.sites.length === 0) return null
              return (
                <table key={copy}>
                  <caption>Loaded Copy {copy} CpG marks in this visual group</caption>
                  <thead>
                    <tr>
                      <th>Coordinate</th>
                      <th>Weighted mean</th>
                      <th>Mean depth</th>
                      <th>Total coverage</th>
                      <th>Samples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copyGroup.sites.map((site) => (
                      <tr key={`${copy}-${site.pos1}-${site.pos2}`}>
                        <td>
                          {group.chrom}:{site.pos1.toLocaleString()}
                        </td>
                        <td>{percent(site.weightedMeanMethylation)}</td>
                        <td>{depth(site.meanCoverage)}</td>
                        <td>{depth(site.totalCoverage)}</td>
                        <td>{site.contributingSampleCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })}
        </div>
      )}
    </Card>
  )
}

export default MethylationEvidenceCard
