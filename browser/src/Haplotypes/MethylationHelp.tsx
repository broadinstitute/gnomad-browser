import React from 'react'

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

export type PhasedMethylationCapability = {
  data_layer: 'SOURCE_PHASED'
  available: boolean
  joinable_to_vcf: false
  status: 'AVAILABLE_ORIENTATION_UNCONFIRMED' | 'UNAVAILABLE_ORIENTATION_UNCONFIRMED' | 'UNAVAILABLE_AOU_SUMMARY_ONLY'
  orientation_status: 'UNCONFIRMED'
  phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET'
  route_run_id: string | null
  source_sample_ids: string[]
  reason: string
}

type Props = {
  // undefined means this release does not provide per-sample availability metadata;
  // null means that metadata is still loading.
  availability?: MethylationSampleAvailability[] | null
  sourceLabel?: string
  phasedCapability?: PhasedMethylationCapability
}

const MethylationHelp = ({ availability, sourceLabel, phasedCapability }: Props) => {
  const unavailable = availability?.filter((sample) => !sample.available) || []
  const availableCount = availability?.filter((sample) => sample.available).length || 0

  return (
    <>
      <p>
        <strong>Sample total:</strong> Enabling this toggle overlays combined per-sample CpG
        methylation beneath each group. Values are averaged across the samples represented by
        the group; they are not allele-specific and are not joined to a VCF haplotype strand.
      </p>
      {sourceLabel && (
        <p><strong>Source:</strong> {sourceLabel}</p>
      )}
      <p>
        Dots show the mean of observed sample-total values at each CpG. Red indicates deviation
        from the population sample-total mean. &quot;Outliers only&quot; filters to groups containing
        samples with high regional variance; it does not establish haplotype-driven methylation.
      </p>
      {phasedCapability && (
        <p>
          <strong>Source hap1/hap2:</strong> {phasedCapability.status} — {phasedCapability.reason}
          {' '}These source labels remain distinct from VCF GT positions. Their phase set is null
          because a source methylation track does not define a browser VCF phase block.
        </p>
      )}
      {availability !== undefined && (
        <section>
          <h4>Sample availability</h4>
          {availability === null ? (
            <p>Availability details are loading.</p>
          ) : (
            <>
              <p>
                {availableCount} of {availability.length} canonical roster samples have sample-total methylation data.
                {unavailable.length > 0 && (
                  <> The remaining {unavailable.length} {unavailable.length === 1 ? 'sample is' : 'samples are'} excluded from methylation requests.</>
                )}
              </p>
              {unavailable.length > 0 && (
                <details>
                  <summary>Unavailable samples ({unavailable.length}) and reasons</summary>
                  <ul>
                    {unavailable.map((sample) => (
                      <li key={sample.sample_id}>
                        <strong>{sample.sample_id}</strong>: {sample.status} — {sample.reason || 'No reason supplied'}
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
