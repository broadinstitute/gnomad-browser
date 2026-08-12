import React, { useState } from 'react'
import styled from 'styled-components'
import { classifyPopulationSupport } from './methylationSupport'
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
  tr:focus {
    outline: 2px solid #2a6f97;
    outline-offset: -2px;
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
  onClose,
}: {
  selection: MethylationSelection
  viewMode: MethylationViewMode
  onViewModeChange: (mode: MethylationViewMode) => void
  onClose: () => void
}) => {
  const [showSites, setShowSites] = useState(selection.kind === 'site')
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

  return (
    <Card aria-live="polite" aria-label="Methylation context evidence">
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
        <dt>Source</dt>
        <dd>
          gnomAD-LR population summaries for the current cohort, run, and assembly; see Methylation
          context help for methods and provenance.
        </dd>
      </dl>
      <p>
        Population variation or a Copy A/B difference does not establish functional effect,
        imprinting, pathogenicity, or diagnosis. Visual groups are display aids, not biological
        events. Group selection summarizes only the population track; sample-total and Copy A/B
        tracks remain site-level, and group-level copy aggregation is deferred.
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
        <button type="button" onClick={() => onViewModeChange('sites')}>
          Switch to CpG sites
        </button>
      )}
      {showSites && (
        <div className="table-scroll">
          <table>
            <caption>Constituent CpG-site evidence</caption>
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
                <tr key={`${site.chrom}-${site.pos1}-${site.pos2}`} tabIndex={0}>
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
        </div>
      )}
    </Card>
  )
}

export default MethylationEvidenceCard
