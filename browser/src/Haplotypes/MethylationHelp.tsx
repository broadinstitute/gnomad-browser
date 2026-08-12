import React from 'react'
import styled from 'styled-components'
import { ExternalLink } from '@gnomad/ui'

import type { JoinedPhasedMethylationCapability } from '../LongReadVariantPage/perCopyMethylation'
import {
  METHYLATION_DISPLAY_SUPPORT_CONFIG,
  METHYLATION_VISUAL_GROUP_CONFIG,
} from './methylationTypes'

export type MethylationSampleAvailability = {
  sample_id: string
  available: boolean
  status:
    | 'AVAILABLE_COMPLETE'
    | 'UNAVAILABLE_INCOMPLETE'
    | 'UNAVAILABLE_NO_ASSAY_SOURCE'
    | 'UNAVAILABLE_NO_CHR22'
    | 'UNAVAILABLE_SOURCE_MARKED_SKIP'
    | 'UNAVAILABLE_NO_CONTIG'
    | 'UNAVAILABLE_ORIENTATION_UNCONFIRMED'
    | 'UNAVAILABLE_AOU_SUMMARY_ONLY'
  reason: string | null
}

const HelpContent = styled.div`
  max-width: 900px;

  p,
  ul {
    margin-top: 0.5em;
  }

  code {
    overflow-wrap: anywhere;
  }
`

const ImportantNotice = styled.section`
  padding: 12px 14px;
  border: 2px solid #a34800;
  border-radius: 4px;
  margin-bottom: 16px;
  background: #fff8e8;

  h3 {
    margin: 0 0 6px;
    color: #713300;
    font-size: 16px;
  }

  p:last-child {
    margin-bottom: 0;
  }
`

const MethodIntroduction = styled.section`
  margin-bottom: 16px;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }

  p:last-child {
    margin-bottom: 0;
  }
`

const Contents = styled.nav`
  padding: 10px 14px;
  border: 1px solid #bbb;
  border-radius: 4px;
  margin: 0 0 16px;
  background: #f7f7f7;

  strong {
    display: block;
    margin-bottom: 4px;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 18px;
    padding-left: 20px;
    margin: 0;
  }
`

const MethodSection = styled.section`
  margin-top: 20px;
  scroll-margin-top: 12px;

  h3 {
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
    margin: 0 0 8px;
    font-size: 16px;
  }
`

const Disclosure = styled.details`
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 10px 0;

  summary {
    cursor: pointer;
    font-weight: 600;
  }

  &[open] summary {
    margin-bottom: 8px;
  }
`

const TableScroller = styled.div`
  overflow-x: auto;
  max-width: 100%;
`

const MethodsTable = styled.table`
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;
  font-size: 13px;

  caption {
    margin-bottom: 6px;
    font-weight: 600;
    text-align: left;
  }

  th,
  td {
    padding: 7px 8px;
    border: 1px solid #bbb;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f2f2f2;
  }
`

export const PerCopyMethylationHelp = ({
  capability,
  unavailableReason,
}: {
  capability?: JoinedPhasedMethylationCapability | null
  unavailableReason?: string | null
}) => {
  let status: React.ReactNode = null
  if (unavailableReason) {
    status = (
      <p>
        <strong>Status:</strong> {unavailableReason}
      </p>
    )
  } else if (capability) {
    status = (
      <p>
        <strong>Status:</strong> {capability.status} — {capability.reason}
      </p>
    )
  }

  return (
    <HelpContent>
      <ImportantNotice aria-label="Per-copy interpretation warning">
        <h3>Descriptive context only</h3>
        <p>
          Copy A/B methylation is not a maternal/paternal assignment, independently validated
          biological lineage, allelic outlier call, or clinical result.
        </p>
      </ImportantNotice>
      <p>
        <strong>Per-copy methylation</strong> uses a hash-bound, operator-approved orientation for
        the exact pinned browser products. Under that assumption, source HAP1 maps to phased VCF GT
        strand 1 and HAP2 to GT strand 2. Each sample&apos;s <code>strand_mapping</code> then maps
        GT1/GT2 to canonical Copy A/B. Copy A is not necessarily GT strand 1. The approval receipt
        is an operational provenance gate, not independent scientific lineage validation.
      </p>
      <p>
        Ordinary Copy A/B percentages are coverage-weighted across admitted observations. Current
        display cautions require at least {METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumCopyReadDepth}×
        median per-CpG depth and{' '}
        {METHYLATION_DISPLAY_SUPPORT_CONFIG.minimumCopySiteCompleteness * 100}% CpG completeness on
        each copy, with a Copy A/B depth ratio no greater than{' '}
        {METHYLATION_DISPLAY_SUPPORT_CONFIG.maximumBalancedCopyDepthRatio}:1 and a
        contributing-sample ratio no greater than{' '}
        {METHYLATION_DISPLAY_SUPPORT_CONFIG.maximumBalancedCopySampleRatio}:1. There is no absolute
        copy-sample minimum above requiring observations for both copies. These checks are not
        significance, confidence, power, p-values, or FDR.
      </p>
      <p>
        In Similarity Clusters view, each collapsed row uses original UPGMA cluster membership, even
        when search or display filters hide members. Every unique{' '}
        <code>(sample_id, vcf_strand)</code> haplotype copy receives equal weight at a CpG; depth is
        reported as evidence but does not weight a copy. A visual group reports the median and range
        of constituent site-level equal-copy means using the Population-derived boundaries. The gray
        mark is the cohort sample-total Population comparator, not a cluster member.
      </p>
      <p>
        Cluster rows wait until every source-eligible member sample is complete or explicitly
        unavailable. A loading member suppresses the summary; errors remain errors. Missing,
        unavailable, and complete requests with no CpGs remain distinct and are never converted to
        0%. The joined endpoint is limited to the admitted region span shown in status, currently at
        most 100 kb.
      </p>
      <p>
        Similarity clusters and visual CpG groups are display-time summaries, not stable biological
        entities, DMRs, events, or evidence of significance, causality, an mQTL, imprinting,
        pathogenicity, or diagnosis.
      </p>
      {status}
    </HelpContent>
  )
}

type Props = {
  // undefined means this release does not provide per-sample availability metadata;
  // null means that metadata is still loading.
  availability?: MethylationSampleAvailability[] | null
  sourceLabel?: string
}

const MethylationHelp = ({ availability, sourceLabel }: Props) => {
  const unavailable = availability?.filter((sample) => !sample.available) || []
  const availableCount = availability?.filter((sample) => sample.available).length || 0
  const support = METHYLATION_DISPLAY_SUPPORT_CONFIG
  const grouping = METHYLATION_VISUAL_GROUP_CONFIG

  return (
    <HelpContent>
      <MethodIntroduction aria-labelledby="methylation-method-introduction">
        <h3 id="methylation-method-introduction">How to read this display</h3>
        <p>
          These tracks provide a descriptive view of observed CpG methylation in the current region.
          They bring together Population sample-total summaries and loaded per-copy measurements so
          that regional patterns, coverage, support, and missingness can be inspected directly.
        </p>
        <p>
          The display is{' '}
          <strong>informed by METAFORA, but it does not run or reproduce METAFORA</strong>.
          Browser-generated CpG groups are temporary viewport summaries—not stable segments,
          differentially methylated regions (DMRs), biological events, or outlier calls. Support
          labels and regional rankings are display and navigation aids, not statistical inference.
        </p>
      </MethodIntroduction>

      {sourceLabel && (
        <p>
          <strong>Source:</strong> {sourceLabel}
        </p>
      )}

      <Contents aria-label="Methylation methodology sections">
        <strong>On this page</strong>
        <ul>
          <li>
            <a href="#methylation-population">Population estimator</a>
          </li>
          <li>
            <a href="#methylation-groups">Visual grouping and view modes</a>
          </li>
          <li>
            <a href="#methylation-layers">Layer estimators</a>
          </li>
          <li>
            <a href="#methylation-support">Display support</a>
          </li>
          <li>
            <a href="#methylation-ranking">Regional ranking</a>
          </li>
          <li>
            <a href="#methylation-mapping">Copy mapping and readiness</a>
          </li>
          <li>
            <a href="#methylation-interpretation">Interpretation</a>
          </li>
          <li>
            <a href="#methylation-reference">Reference</a>
          </li>
        </ul>
      </Contents>

      <MethodSection id="methylation-population">
        <h3>Population estimator and composition</h3>
        <p>
          At each CpG, Population is the arithmetic mean of the observed sample-total methylation
          percentages. Every observed sample row has equal weight: read depth does not weight the
          Population percentage. The number of observed samples can vary by CpG because missing rows
          remain absent rather than becoming zero.
        </p>
        <p>
          This is an unstratified all-observed-sample comparator for the displayed assay cohort. It
          has no depth weighting, depth cap, Laplace correction, covariate or batch adjustment,
          ancestry stratification, tissue-specific model, or leave-one-out calculation. The focal
          sample, when present, contributes to its site mean and population SD.
        </p>
      </MethodSection>

      <MethodSection id="methylation-groups">
        <h3>Visual grouping and view modes</h3>
        <Disclosure open>
          <summary>How visual groups are constructed</summary>
          <p>
            The browser uses ordered Population site means from the exact requested viewport. It
            creates hard boundaries at chromosome changes, returned records with malformed or
            missing coordinates/means, coordinate reversals, and adjacent CpG gaps greater than{' '}
            {grouping.maximumGapBp.toLocaleString()} bp. It does not fetch padded flanks, so
            query-edge groups are not claimed to be complete.
          </p>
          <p>
            For an input with at most {grouping.fallbackInputSites.toLocaleString()} valid sites,
            the browser minimizes a penalized piecewise-constant objective: the sum of within-group
            squared errors (SSE) plus {grouping.penaltySquaredPercentagePoints} squared percentage
            points for each additional group. A group contains at most {grouping.maximumSites} CpGs.
            If there are more than {grouping.fallbackInputSites.toLocaleString()} valid sites, or
            penalized grouping creates more than {grouping.maximumOutputGroups} groups,
            deterministic coordinate-ordered fixed bins are used while preserving hard boundaries.
            If the {grouping.maximumSites}-CpG and {grouping.maximumOutputGroups}-group caps still
            cannot represent the viewport, no groups are returned; CpG sites remain available and no
            partial group overlay is claimed.
          </p>
          <p>
            Boundaries are recalculated from the current viewport and configuration. They can change
            when the viewport, fetched bytes, or configuration changes. Current configuration:{' '}
            <code>{grouping.version}</code>, primary method <code>{grouping.method}</code>, fallback{' '}
            <code>{grouping.fallbackMethod}</code>.
          </p>
        </Disclosure>

        <TableScroller>
          <MethodsTable>
            <caption>Sites / Groups / Both</caption>
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">What is shown</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">CpG sites</th>
                <td>Raw Population and lower-layer per-CpG marks; no group overlay.</td>
              </tr>
              <tr>
                <th scope="row">CpG groups</th>
                <td>
                  Group rectangles/medians and lower-layer group summaries. Raw marks are hidden
                  except in selected-group drill-down.
                </td>
              </tr>
              <tr>
                <th scope="row">Both</th>
                <td>Sites and groups from the same fetched bytes and boundaries.</td>
              </tr>
            </tbody>
          </MethodsTable>
        </TableScroller>
        <p>Changing these modes does not issue a new data request.</p>
      </MethodSection>

      <MethodSection id="methylation-layers">
        <h3>Layer-specific estimators</h3>
        <TableScroller>
          <MethodsTable>
            <caption>Displayed percentages do not all use the same weighting</caption>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">CpG/site estimator</th>
                <th scope="col">Visual-group summary</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Population</th>
                <td>
                  Arithmetic mean of observed sample-total percentages; equal sample-row weight.
                </td>
                <td>Median of constituent Population site means.</td>
              </tr>
              <tr>
                <th scope="row">Loaded sample totals</th>
                <td>Coverage-weighted across the currently loaded, represented sample rows.</td>
                <td>Coverage-weighted across represented observations and CpGs.</td>
              </tr>
              <tr>
                <th scope="row">Ordinary Copy A/B</th>
                <td>Coverage-weighted across admitted observations for each canonical copy.</td>
                <td>Coverage-weighted across represented copy observations and CpGs.</td>
              </tr>
              <tr>
                <th scope="row">Similarity clusters</th>
                <td>
                  Equal weight for every measured haplotype copy at a CpG; an individual with both
                  copies in a cluster contributes two copy observations.
                </td>
                <td>Median of constituent site-level equal-copy means.</td>
              </tr>
            </tbody>
          </MethodsTable>
        </TableScroller>
        <p>
          Loaded sample totals normally represent API-ranked samples already fetched by the
          interface, or all carrier samples after an explicit load-all action. They are not
          allele-specific and are not joined to a VCF haplotype strand.
        </p>
      </MethodSection>

      <MethodSection id="methylation-support">
        <h3>Display support cautions</h3>
        <TableScroller>
          <MethodsTable>
            <caption>
              Current configuration: <code>{support.version}</code>
            </caption>
            <thead>
              <tr>
                <th scope="col">Layer</th>
                <th scope="col">Current checks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Population site</th>
                <td>
                  Mean read depth at least {support.minimumMeanReadDepth}× and at least{' '}
                  {support.minimumObservedSamples} observed sample totals.
                </td>
              </tr>
              <tr>
                <th scope="row">Loaded sample-total group</th>
                <td>
                  Median per-CpG depth at least {support.minimumMeanReadDepth}× and at least{' '}
                  {support.minimumCopySiteCompleteness * 100}% of group CpGs represented. The
                  Population {support.minimumObservedSamples}-sample check is not applied to this
                  selected-row layer.
                </td>
              </tr>
              <tr>
                <th scope="row">Copy A/B group</th>
                <td>
                  Each copy has median per-CpG depth at least {support.minimumCopyReadDepth}× and at
                  least {support.minimumCopySiteCompleteness * 100}% CpG completeness; Copy A/B
                  depth ratio must be no greater than {support.maximumBalancedCopyDepthRatio}:1 and
                  the contributing-sample ratio no greater than{' '}
                  {support.maximumBalancedCopySampleRatio}:1 for the current “balanced-enough”
                  label. There is no absolute minimum number of contributing copy samples, although
                  zero observations on either copy is missing.
                </td>
              </tr>
            </tbody>
          </MethodsTable>
        </TableScroller>
        <p>
          Hollow or hatched marks communicate display support cautions. These thresholds are not
          significance, confidence, power, p-values, false-discovery rates (FDR), biological
          validation, or clinical cutoffs. Meeting them does not prove that a difference is real or
          biological.
        </p>
      </MethodSection>

      <MethodSection id="methylation-ranking">
        <h3>API-ranked regional deviations</h3>
        <p>
          For each sample, the API counts observed CpGs satisfying{' '}
          <code>|sample total − site mean| &gt; 2 × site population SD</code> and sorts samples by
          descending count, not fraction. The focal sample is included in the site mean and
          population SD (denominator N, not uncertainty of the mean). Each sample&apos;s denominator
          is its own number of observed joined CpGs, so denominators can vary with sample
          missingness.
        </p>
        <p>
          Coverage does not enter the inequality. There is no depth, covariate, ancestry, segment,
          continuity, multiple-testing, p-value, or FDR model. The optional haplotype filter uses
          immutable sample identities from this response rather than whichever detail rows have
          loaded. This legacy ranking is not METAFORA and is not an outlier or event call.
        </p>
      </MethodSection>

      <MethodSection id="methylation-mapping">
        <h3>Copy mapping, missingness, and readiness</h3>
        <Disclosure>
          <summary>How HAP1/HAP2 becomes Copy A/B</summary>
          <p>
            For exact pinned products, a hash-bound, operator-approved orientation assumes source
            HAP1 → phased VCF GT strand 1 and HAP2 → GT strand 2. Each sample&apos;s GT-to-A/B
            mapping then assigns canonical Copy A/B. Copy A is not inherently GT1. HAP1/HAP2,
            GT1/GT2, and A/B do not mean maternal/paternal and are not independently validated
            biological lineages. The receipt is an operational provenance and release gate, not
            scientific validation.
          </p>
        </Disclosure>
        <Disclosure>
          <summary>What loading, missing, and unavailable mean</summary>
          <p>
            Population, sample-total, and copy rows preserve absence: missing values are never
            filled with 0%. For a per-copy row, every requested source-eligible sample must reach a
            terminal state before the summary is painted: complete or explicitly unavailable. A
            loading sample suppresses the row and an error remains an error. A complete request with
            no returned CpGs means “no CpGs,” which is distinct from unavailable source, loading, or
            failure. Changing the cohort, region, layer, or admitted product scope invalidates stale
            request state so late responses cannot repaint a new view.
          </p>
        </Disclosure>
      </MethodSection>

      <MethodSection id="methylation-interpretation">
        <h3>Interpretation limits</h3>
        <p>
          These tracks are descriptive, research-facing context. Methylation depends on assay,
          tissue, coverage, cohort composition, ancestry and other biological or technical factors
          not modeled here. A visual difference does not establish significance, causality, an mQTL,
          imprinting, pathogenicity, diagnosis, treatment relevance, or any clinical result. Do not
          use this display as a validated statistical, biological, or clinical assessment.
        </p>
      </MethodSection>

      <MethodSection id="methylation-reference">
        <h3>Reference</h3>
        <p>
          Tanner D Jensen, Rhina Kaur, Devon E Bonner, et al. “
          <ExternalLink href="https://doi.org/10.64898/2026.06.09.26355279">
            Population-scale detection of methylation outliers from long-read genome sequencing
          </ExternalLink>
          .” medRxiv preprint, posted June 11, 2026. Not peer reviewed.
        </p>
      </MethodSection>

      {availability !== undefined && (
        <MethodSection aria-labelledby="methylation-availability-heading">
          <h3 id="methylation-availability-heading">Sample availability</h3>
          {availability === null ? (
            <p>Availability details are loading.</p>
          ) : (
            <>
              <p>
                {availableCount} of {availability.length} canonical roster samples have sample-total
                methylation data.
                {unavailable.length > 0 && (
                  <>
                    {' '}
                    The remaining {unavailable.length}{' '}
                    {unavailable.length === 1 ? 'sample is' : 'samples are'} excluded from
                    methylation requests.
                  </>
                )}
              </p>
              {unavailable.length > 0 && (
                <Disclosure>
                  <summary>Unavailable samples ({unavailable.length}) and reasons</summary>
                  <ul>
                    {unavailable.map((sample) => (
                      <li key={sample.sample_id}>
                        <strong>{sample.sample_id}</strong>: {sample.status} —{' '}
                        {sample.reason || 'No reason supplied'}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </>
          )}
        </MethodSection>
      )}
    </HelpContent>
  )
}

export default MethylationHelp
