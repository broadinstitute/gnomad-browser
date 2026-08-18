import {
  parseTrLocusId,
  trComponentDisplayRegion,
  trLocusDisplayEnvelope,
  trLocusUrl,
} from './longReadTrLocusId'

const htt =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'

describe('long-read tandem-repeat locus identity', () => {
  test('round trips the representative ordinary locus and converts coordinates explicitly', () => {
    const locus = parseTrLocusId('4-39348424-39348479-AAAAG')!
    expect(locus.canonicalId).toBe('4-39348424-39348479-AAAAG')
    expect(locus.sourceTrid).toBe('4-39348424-39348479-AAAAG')
    expect(trComponentDisplayRegion(locus.components[0])).toEqual({
      chrom: '4',
      start1: 39348425,
      end1: 39348479,
    })
  })

  test('preserves HTT component order and duplicate motifs', () => {
    const locus = parseTrLocusId(htt)!
    expect(locus.canonicalId).toBe(htt)
    expect(locus.components).toHaveLength(6)
    expect(locus.components.map((component) => component.motif)).toEqual([
      'CAG',
      'CAA',
      'CCG',
      'CCT',
      'GCC',
      'CCG',
    ])
    expect(trLocusDisplayEnvelope(locus)).toEqual({ chrom: '4', start1: 3074877, end1: 3075040 })
    expect(parseTrLocusId(locus.sourceTrid)?.canonicalId).toBe(htt)
  })

  test('canonicalizes chr/lowercase input and emits a canonical URL', () => {
    const locus = parseTrLocusId('chr4-39348424-39348479-aaaag')!
    expect(locus.canonicalId).toBe('4-39348424-39348479-AAAAG')
    expect(trLocusUrl(locus, 'aou', 'chr4-39348424-TRV-55~7')).toBe(
      '/tandem-repeat/4-39348424-39348479-AAAAG?dataset=gnomad_r4_lr&lr_cohort=aou&allele=chr4-39348424-TRV-55%7E7'
    )
  })

  test.each([
    '',
    '4-10-10-CAG',
    '4-11-10-CAG',
    '4-x-10-CAG',
    '4-1-10-',
    '23-1-10-CAG',
    '4-1-10-CAG+5-1-10-CAG',
    '4-1-10-CAG,+4-1-10-CAG',
  ])('rejects malformed identity %s', (value) => expect(parseTrLocusId(value)).toBeNull())

  test('does not collapse motif or overlap collisions', () => {
    expect(parseTrLocusId('4-1-10-CAG')?.canonicalId).not.toBe(
      parseTrLocusId('4-1-10-CAA')?.canonicalId
    )
    expect(parseTrLocusId('4-1-10-CAG')?.canonicalId).not.toBe(
      parseTrLocusId('4-2-9-CAG')?.canonicalId
    )
  })
})
