import React from 'react'

import { RepeatCountPlots } from './types'

export const repeatPlotAvailable = (
  plots: RepeatCountPlots | undefined,
  kind: 'allele' | 'genotype'
) => {
  if (plots?.status === 'AVAILABLE_EXACT') return true
  if (plots?.status !== 'AVAILABLE_SOURCE_CONTEXT' || !plots.source_context) return false
  return kind === 'allele'
    ? plots.allele_status === 'AVAILABLE'
    : ['AVAILABLE_SOURCE_ENCODING', 'AVAILABLE_TWO_COPY_CONSISTENT'].includes(
        plots.pair_status || ''
      )
}

export const SourceContextHistogramMetadata = ({ plots }: { plots: RepeatCountPlots }) => {
  const context = plots.source_context
  if (plots.status !== 'AVAILABLE_SOURCE_CONTEXT' || !context) return null
  return (
    <div>
      <p>
        <strong>Named repeat:</strong> {context.source_locus_id}; motif: {plots.repeat_unit}
      </p>
      <p>
        <strong>Source record interval (as reported):</strong> {context.interval_raw}
      </p>
      <p>
        <strong>Source VC annotation:</strong> {context.vc_raw || 'Blank (not supplied)'}
      </p>
      {context.context_relation === 'CONTAINS' ? (
        <p>
          <strong>Wider source context.</strong> Measurements originate from a larger source record
          and are associated with this named repeat; they are not independently localized to its
          interval.
        </p>
      ) : (
        <p>
          Source context relation: {context.context_relation}. These measurements are associated
          with the named repeat, not independently localized to its interval.
        </p>
      )}
      <p>
        Bounds are shown as reported, without POS conversion. Measurement units and producer version
        are unknown; values are source-reported sizes, not total allele lengths.
      </p>
      <p>
        Measurement: {context.measurement_kind}; units: {context.unit}; semantics evidence:{' '}
        {context.semantics_evidence_status}.
      </p>
      {plots.primary_binding && (
        <p>
          Primary binding: {plots.primary_binding.status}; primary AN concordance:{' '}
          {plots.primary_binding.an_concordance}. Source counts do not replace primary AN or REF
          counts.
        </p>
      )}
      {plots.primary_an_comparison && (
        <p>
          Numerical source-count versus primary AN comparison: {plots.primary_an_comparison}. This
          comparison does not establish shared records, primary binding or cohort coverage.
        </p>
      )}
      {!repeatPlotAvailable(plots, 'genotype') && (
        <p>Size-pair distribution unavailable: {plots.pair_status || 'NOT_AVAILABLE'}.</p>
      )}
      {!repeatPlotAvailable(plots, 'allele') && (
        <p>Repeat-size distribution unavailable: {plots.allele_status || 'NOT_AVAILABLE'}.</p>
      )}
      <p>
        Observed source counts only; full-cohort coverage is not established. No exact source-ALT
        contributors or no-call denominator are available. Source population and sex labels are
        metadata, not inferred ancestry or karyotype. These plots do not filter the source-ALT
        index.
      </p>
      <details>
        <summary>Source provenance</summary>
        <p>
          Source: {context.source_uri}; generation: {context.source_generation}; MD5:{' '}
          {context.source_md5_base64}; data row: {context.source_row_ordinal}.
        </p>
        <p>
          Projection: {context.projection_version}; receipt: {context.receipt_digest}.
        </p>
      </details>
    </div>
  )
}
