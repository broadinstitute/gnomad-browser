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
}) => (
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
      averaged. HAP, GT, and canonical A/B labels have no maternal or paternal meaning, and the
      source track does not define a VCF phase set.
    </p>
    {unavailableReason ? (
      <p>
        <strong>Status:</strong> {unavailableReason}
      </p>
    ) : capability ? (
      <p>
        <strong>Status:</strong> {capability.status} — {capability.reason}
      </p>
    ) : null}
  </>
)

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
        Dots show the mean of observed sample-total values at each CpG. Red indicates deviation from
        the population sample-total mean. &quot;Outliers only&quot; filters to groups containing
        samples with high regional variance; it does not establish haplotype-driven methylation.
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
