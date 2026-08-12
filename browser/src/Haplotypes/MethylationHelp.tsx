import React from 'react'
import type { JoinedPhasedMethylationCapability } from '../LongReadVariantPage/perCopyMethylation'

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
    <>
      <p>
        <strong>Per-copy methylation</strong> uses the confirmed chromosome-wide mapping for the
        pinned browser bundle to place each joined source observation beneath canonical chromosome
        copy A or B in Diploid view. Copy A is not necessarily VCF GT strand 1.
      </p>
      <p>
        Under the admitted chromosome-wide receipt, source HAP1 maps to VCF GT strand 1 and source
        HAP2 maps to VCF GT strand 2. Each represented sample&apos;s
        <code> strand_mapping </code> then maps GT1/GT2 to canonical copy A/B before CpG values are
        summarized with admitted read coverage. HAP, GT, and canonical A/B labels have no maternal
        or paternal meaning, and the source track does not define a VCF phase set.
      </p>
      <p>
        Copy A/B read depth is evidence for each displayed percentage. Uneven or limited support
        does not make an observation false, but it makes a visual difference less comparable and
        should be interpreted cautiously. Balanced support does not prove a biological effect.
      </p>
      {status}
    </>
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

  return (
    <>
      <p>
        <strong>Sample total:</strong> Enabling this toggle overlays combined per-sample CpG
        methylation beneath each group. Values are averaged across the samples represented by the
        group; they are not allele-specific and are not joined to a VCF haplotype strand.
      </p>
      {sourceLabel && (
        <p>
          <strong>Source:</strong> {sourceLabel}
        </p>
      )}
      <p>
        The <strong>methylation view</strong> control can preserve individual CpG sites, show
        temporary browser-derived visual CpG groups, or show both without another request. Groups
        are recalculated for the displayed region and are not DMRs or stable biological events. The
        population-summary boundaries are also used for loaded sample-total and Copy A/B layers.
        Lower-layer group percentages are coverage-weighted display summaries; their evidence shows
        median per-CpG depth and represented or missing CpGs. Raw CpG marks remain in CpG sites,
        Both, and the selected-group drill-down. Group objects contain at most 200 CpGs and group
        output is capped at 200 objects; if both bounds cannot represent a fetched viewport, the
        browser shows no partial group overlay and keeps the CpG-site view available.
      </p>
      <p>
        The summary request covers the displayed viewport only. It does not fetch padded flanks, so
        groups touching either query edge may continue outside the display; the browser does not
        claim edge-complete boundaries or padded-and-clipped segmentation.
      </p>
      <p>
        Population summaries show the population mean, site standard deviation, mean read depth, and
        observed sample totals. Hollow or hatched marks indicate display support cautions, not
        significance cutoffs. Missing values remain unavailable and are never shown as zero.
      </p>
      <p>
        <strong>Filter haplotypes to API-ranked regional deviations</strong> is opt-in and uses the
        immutable sample identities returned by the regional methylation-outliers response. A sample
        site contributes to that response when it differs from the population mean by more than 2 ×
        that site&apos;s standard deviation. The filter is not recomputed from whichever detail rows
        have loaded, is not depth-aware or diagnostic, and is not a METAFORA outlier call. Unusual
        methylation does not establish functional effect, imprinting, pathogenicity, or diagnosis.
      </p>
      {availability !== undefined && (
        <section>
          <h4>Sample availability</h4>
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
                <details>
                  <summary>Unavailable samples ({unavailable.length}) and reasons</summary>
                  <ul>
                    {unavailable.map((sample) => (
                      <li key={sample.sample_id}>
                        <strong>{sample.sample_id}</strong>: {sample.status} —{' '}
                        {sample.reason || 'No reason supplied'}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </section>
      )}
    </>
  )
}

export default MethylationHelp
