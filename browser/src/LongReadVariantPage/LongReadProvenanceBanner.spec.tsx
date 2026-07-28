import { describe, expect, test } from '@jest/globals'

import { modalityAvailable } from './LongReadProvenanceBanner'

const provenance = {
  enabled: true,
  mixed_provenance: true,
  scope_label: 'GRCh38 chr22',
  warning: 'Prototype only',
  sources: [
    { modality: 'PRIMARY_VARIANTS', source: 'Y1_ACCEPTED_R2' as const, available: true, label: 'Y1 HGSVC/HPRC chr22 — accepted r2 primary', run_id: 'run-r2' },
    { modality: 'METHYLATION', source: 'LEGACY_V1' as const, available: true, label: 'Legacy LR ancillary reference — not Y1; read-only' },
    { modality: 'RECOMBINATION', source: 'EXTERNAL_REFERENCE' as const, available: true, label: 'External reference (UCSC hg38)' },
    { modality: 'HAPLOTYPES', source: 'UNAVAILABLE' as const, available: false, label: 'Unavailable' },
  ],
}

describe('long-read provenance capabilities', () => {
  test('uses server capabilities and fails unknown modalities closed', () => {
    expect(modalityAvailable(provenance, 'METHYLATION')).toBe(true)
    expect(modalityAvailable(provenance, 'COVERAGE')).toBe(false)
    expect(modalityAvailable(provenance, 'HAPLOTYPES')).toBe(false)
  })
})
