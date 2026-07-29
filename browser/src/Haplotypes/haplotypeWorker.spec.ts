import { jest } from '@jest/globals'

const variants = {
  variant_id: ['variant-1'],
  chrom: ['chr22'],
  pos: [100],
  end: [null],
  ref: ['A'],
  alt: ['G'],
  allele_type: ['snv'],
  allele_length: [0],
  freq_af: [0.5],
  freq_ac: [1],
  freq_an: [4],
  rsid: [''],
  cadd_phred: [null],
  phylop: [null],
  sv_consequences: [null],
  dbsnp_id: [null],
  tr_id: [null],
  tr_motifs: [null],
  gnomad_str: [null],
  allele_methylation: [null],
  motif_counts: [null],
  allele_purity: [null],
  populations: [[]],
}

describe('haplotype worker VCF carrier identity', () => {
  test('retains structured vcf_strand and phase_set from INIT to READY', () => {
    jest.resetModules()
    const postMessage = jest.fn()
    Object.defineProperty(globalThis, 'postMessage', {
      value: postMessage,
      configurable: true,
      writable: true,
    })

    require('./haplotypeWorker')
    const onmessage = (globalThis as any).onmessage
    expect(typeof onmessage).toBe('function')

    onmessage({
      data: {
        type: 'INIT',
        rawData: {
          variants,
          carrier_variant_indices: { 'sample-1:2': [0] },
          carriers: [{
            sample_id: 'sample-1',
            vcf_strand: 2,
            phase_set: 'ps-2',
            phase_sets: ['ps-2'],
            variant_indices: [0],
            phase_set_by_variant: [{ variant_index: 0, phase_set: 'ps-2' }],
          }],
        },
        minAf: 0,
        sortBy: 'sample_count',
        isDiploidView: false,
        regionSize: 1_000,
      },
    })

    const ready = postMessage.mock.calls
      .map(([message]) => message as any)
      .find((message) => message.type === 'READY')
    expect(ready.data.groups[0].samples[0]).toMatchObject({
      sample_id: 'sample-1',
      vcf_strand: 2,
      phase_set: 'ps-2',
    })
  })
})
