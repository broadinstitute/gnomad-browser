import React from 'react'

export type MethylationSampleAvailability = {
  sample_id: string
  available: boolean
  status: 'AVAILABLE_COMPLETE' | 'UNAVAILABLE_INCOMPLETE' | 'UNAVAILABLE_NO_ASSAY_SOURCE' | 'UNAVAILABLE_NO_CHR22'
  reason: string | null
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
        Enabling this toggle overlays per-CpG methylation data directly beneath each haplotype
        group. Because long-read sequencing captures both genetic variants and 5mC epigenetic
        modifications on the same reads, this lets you visually identify allele-specific
        methylation (ASM) where specific structural haplotypes drive local hyper- or
        hypo-methylation.
      </p>
      {sourceLabel && (
        <p><strong>Source:</strong> {sourceLabel}</p>
      )}
      <p>
        You&apos;ll see a track of dots representing the group&apos;s mean methylation level at each CpG
        site. Sites that deviate significantly from the overall population mean are highlighted
        in red, flagging potential haplotype-driven epigenetic effects. If you check &quot;Outliers
        only,&quot; the view will filter down to groups containing samples that exhibit high regional
        methylation variance.
      </p>
      {availability !== undefined && (
        <section>
          <h4>Sample availability</h4>
          {availability === null ? (
            <p>Availability details are loading.</p>
          ) : (
            <>
              <p>
                {availableCount} of {availability.length} canonical samples have methylation data.
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
