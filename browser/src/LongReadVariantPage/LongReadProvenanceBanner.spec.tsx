import { describe, expect, test } from '@jest/globals'

import { modalityAvailable } from './LongReadProvenanceBanner'

const provenance = {
  enabled: true,
  scope_label: 'gnomad_lr_y1_scratch_v5_current: chr22',
  sources: [
    {
      modality: 'PRIMARY_VARIANTS', source: 'Y1_ACCEPTED' as const,
      database: 'gnomad_lr_y1_scratch_v5_current', available: true,
      label: 'Accepted Y1 — database=gnomad_lr_y1_scratch_v5_current; cohort=hgsvc_hprc; run=run-1; scope=y1/GRCh38/chr22/full_chromosome; state=accepted_frozen',
      run_id: 'run-1', status: 'accepted_frozen', scope: 'full_chromosome',
    },
    { modality: 'METHYLATION', source: 'UNAVAILABLE' as const, available: false, label: 'Optional table is unavailable' },
    { modality: 'RECOMBINATION', source: 'EXTERNAL_REFERENCE' as const, available: true, label: 'External reference (UCSC hg38)' },
    { modality: 'HAPLOTYPES', source: 'Y1_ACCEPTED' as const, available: true, label: 'Accepted Y1' },
  ],
}

describe('long-read Y1 provenance capabilities', () => {
  test('uses server capabilities and fails unknown or optional modalities closed', () => {
    expect(modalityAvailable(provenance, 'METHYLATION')).toBe(false)
    expect(modalityAvailable(provenance, 'COVERAGE')).toBe(false)
    expect(modalityAvailable(provenance, 'HAPLOTYPES')).toBe(true)
  })

  test('uses generic accepted-Y1 provenance instead of an R2 label', () => {
    const primary = provenance.sources[0]
    expect(primary.source).toBe('Y1_ACCEPTED')
    expect(primary.label).toContain('database=gnomad_lr_y1_scratch_v5_current')
    expect(primary.label).toContain('run=run-1')
    expect(primary.label).toContain('state=accepted_frozen')
    expect(primary.label).not.toMatch(/\br2\b|published|candidate/i)
  })
})
