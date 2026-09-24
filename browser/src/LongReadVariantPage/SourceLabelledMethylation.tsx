import React, { useEffect, useState } from 'react'

type Capability = {
  available: boolean
  joinable_to_vcf: boolean
  route_run_id: string | null
  source_sample_ids: string[]
  reason: string
}
type Point = {
  chr: string
  pos1: number
  pos2: number
  sample: string
  methylation: number
  coverage: number
  data_layer: string
  source_haplotype: 'HAP1' | 'HAP2'
  vcf_strand: null
  phase_set: null
}

export const rawMethylationScope = (chrom: string, start: number, stop: number, cohort: string) => {
  if (cohort !== 'hgsvc_hprc') return { reason: 'No AoU methylation source is admitted; HGSVC/HPRC is not a fallback.' }
  if (!/^(chr)?([1-9]|1[0-9]|2[0-2])$/.test(chrom)) {
    return { reason: 'Raw chrX is unavailable because exact source sample membership is not bound; chrY has no source data.' }
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(stop) || start < 1 || stop < start || stop - start + 1 > 10000) {
    return { reason: 'Choose a region of at most 10,000 bases for this single-sample raw view.' }
  }
  // The standalone API uses inclusive native BED starts, not browser one-based positions.
  return { chrom: chrom.startsWith('chr') ? chrom : `chr${chrom}`, start: start - 1, stop: stop - 1 }
}

export const validateRawMethylation = (rows: Point[], sample: string, chrom: string, start: number, stop: number) => {
  if (!Array.isArray(rows) || rows.some((row) =>
    row.chr !== chrom || row.sample !== sample || row.data_layer !== 'SOURCE_PHASED' ||
    !['HAP1', 'HAP2'].includes(row.source_haplotype) || row.vcf_strand !== null || row.phase_set !== null ||
    !Number.isSafeInteger(row.pos1) || row.pos1 < start || row.pos1 > stop || row.pos2 !== row.pos1 + 1 ||
    !Number.isFinite(row.methylation) || row.methylation < 0 || row.methylation > 100 ||
    !Number.isSafeInteger(row.coverage) || row.coverage < 0
  )) throw new Error('Raw methylation response does not match the requested source-labelled scope.')
  return rows
}

const query = async (document: string, variables: Record<string, unknown>, signal: AbortSignal) => {
  const response = await fetch('/api/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ query: document, variables }),
  })
  if (!response.ok) throw new Error(`Methylation API request failed (${response.status})`)
  const result = await response.json()
  if (result.errors?.length) throw new Error(result.errors.map((error: any) => error.message).join('; '))
  return result.data
}

const SourceLabelledMethylation = ({ chrom, start, stop, cohort }: {
  chrom: string; start: number; stop: number; cohort: string
}) => {
  const [capabilityState, setCapabilityState] = useState<{ cohort: string; value?: Capability; error?: string } | null>(null)
  const [sample, setSample] = useState('HG00097')
  const [request, setRequest] = useState<{ scope: string; nonce: number } | null>(null)
  const [result, setResult] = useState<{ scope: string; rows?: Point[]; error?: string } | null>(null)
  const capability = capabilityState?.cohort === cohort ? capabilityState.value : undefined
  const range = rawMethylationScope(chrom, start, stop, cohort)
  const scope = JSON.stringify([cohort, chrom, start, stop, sample, capability?.route_run_id])
  const reason = range.reason || (capabilityState?.cohort === cohort ? capabilityState.error : null) ||
    (capability ? (!capability.available || capability.joinable_to_vcf ? capability.reason : null) : 'Checking raw source availability…') ||
    (!capability?.source_sample_ids.includes(sample) ? 'Select a sample with a source assay.' : null)
  const current = result?.scope === scope ? result : null

  useEffect(() => {
    const controller = new AbortController()
    query(`query RawMethylationCapability($cohort: LongReadCohort!) {
      phased_methylation_capability(lr_cohort: $cohort) {
        available joinable_to_vcf route_run_id source_sample_ids reason
      }
    }`, { cohort }, controller.signal).then((data) => {
      if (!data?.phased_methylation_capability) throw new Error('Raw capability response is empty')
      if (!controller.signal.aborted) setCapabilityState({ cohort, value: data.phased_methylation_capability })
    }).catch((error) => {
      if (!controller.signal.aborted) setCapabilityState({ cohort, error: error.message })
    })
    return () => controller.abort()
  }, [cohort])

  useEffect(() => {
    if (!request || request.scope !== scope || reason) return undefined
    const controller = new AbortController()
    setResult({ scope })
    query(`query RawMethylationPoints($chrom: String!, $start: Int!, $stop: Int!, $sample: String!, $cohort: LongReadCohort!) {
      source_phased_methylation(chrom: $chrom, start: $start, stop: $stop, sample_id: $sample, lr_cohort: $cohort) {
        chr pos1 pos2 sample methylation coverage data_layer source_haplotype vcf_strand phase_set
      }
    }`, { chrom: range.chrom, start: range.start, stop: range.stop, sample, cohort }, controller.signal)
      .then((data) => {
        const rows = validateRawMethylation(data?.source_phased_methylation, sample, range.chrom!, range.start!, range.stop!)
        if (!controller.signal.aborted) setResult({ scope, rows })
      }).catch((error) => {
        if (!controller.signal.aborted) setResult({ scope, error: error.message })
      })
    return () => controller.abort()
  }, [request, scope, reason, range.chrom, range.start, range.stop, sample, cohort])

  return (
    <section aria-label="Raw source-labelled methylation" style={{ margin: '18px 0', border: '1px solid #bbb', padding: 16 }}>
      <h3>Raw source-labelled methylation — not VCF-joined</h3>
      <p>Preserved HGSVC/HPRC source HAP1/HAP2 measurements, not browser Copy A/B or maternal/paternal haplotypes.
        VCF strand and phase set are unknown. Sample-total methylation is a separate product and is not displayed here.</p>
      <p>One source sample, autosomes only, at most 10 kb. Sparse or missing observations are not zero methylation or complete assay coverage.</p>
      {capability?.available && <p><small>Source run: {capability.route_run_id}</small></p>}
      <label htmlFor="raw-methylation-sample">Source sample: </label>
      <select id="raw-methylation-sample" value={sample} onChange={(event) => { setSample(event.target.value); setRequest(null) }} disabled={!capability?.available || !!range.reason}>
        {(capability?.source_sample_ids || [sample]).map((id) => <option key={id} value={id}>{id}</option>)}
      </select>{' '}
      <button type="button" disabled={!!reason} onClick={() => setRequest({ scope, nonce: Date.now() })}>Load raw HAP1/HAP2</button>
      {reason && <p role="status">{reason}</p>}
      {!reason && current && !current.rows && !current.error && <p role="status">Loading raw measurements…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.rows && <>
        <p role="status">{current.rows.length} measured source-haplotype CpG observations for {sample}.
          {current.rows.length === 0 && ' No observations in this interval; this is not a zero methylation call.'}</p>
        <p>Positions below are native BED0 intervals [start, end); plotted browser position is BED start + 1. Y axis: methylation 0–100%.</p>
        {(['HAP1', 'HAP2'] as const).map((hap) => <div key={hap}>
          <strong>Source {hap}</strong>
          <svg role="img" aria-label={`Source ${hap} measured CpGs`} viewBox="0 0 900 130" style={{ width: '100%', height: 130 }}>
            <text x="0" y="15" fontSize="12">100%</text><text x="0" y="116" fontSize="12">0%</text>
            <line x1="45" x2="890" y1="110" y2="110" stroke="#aaa" />
            {current.rows!.filter((row) => row.source_haplotype === hap).map((row, index) => <circle
              key={`${row.pos1}-${index}`} data-testid="raw-methylation-point"
              cx={45 + 845 * (row.pos1 + 1 - start) / Math.max(1, stop - start)} cy={110 - row.methylation}
              r="3" fill={hap === 'HAP1' ? '#176b9c' : '#954d99'}>
              <title>{`${sample} source ${hap}; BED [${row.pos1}, ${row.pos2}); ${row.methylation}% methylation; coverage ${row.coverage}`}</title>
            </circle>)}
          </svg>
        </div>)}
        <details><summary>Measured values (first 30 observations)</summary>
          <table><thead><tr><th>Native BED interval</th><th>Source haplotype</th><th>Methylation %</th><th>Coverage</th></tr></thead>
            <tbody>{current.rows.slice(0, 30).map((row, i) => <tr key={i}><td>[{row.pos1}, {row.pos2})</td><td>{row.source_haplotype}</td><td>{row.methylation}</td><td>{row.coverage}</td></tr>)}</tbody>
          </table>
        </details>
      </>}
    </section>
  )
}
export default SourceLabelledMethylation
