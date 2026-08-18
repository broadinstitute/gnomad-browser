import { formatLongReadAlleleDisplay, formatLongReadVariantId } from './formatLongReadVariantId'

describe('formatLongReadVariantId', () => {
  test.each([
    ['chr22-100-A-T', '22-100-A-T'],
    ['CHR22-101-AT-A', '22-101-AT-A'],
    ['chr4-39348424-DEL-55~1', '4-39348424-DEL-55'],
    ['chr4-39348424-TRV-55~49', '4-39348424-TRV-55 (Allele 49)'],
    ['source-chr-event', 'source-chr-event'],
  ])('formats legacy/canonical %s as %s', (rawId, displayId) => {
    expect(formatLongReadVariantId(rawId)).toBe(displayId)
  })
})

describe('formatLongReadAlleleDisplay', () => {
  test('uses the actual allele for a single-ALT SNV', () => {
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'chr1-55039847-SNV-1~1',
        source_variant_id: 'chr1-55039847-SNV-1',
        alt_index: 1,
        alt_count: 1,
        chrom: 'chr1',
        pos: 55039847,
        ref: 'G',
        alt: 'A',
        allele_type: 'snv',
      }).label
    ).toBe('1-55039847-G-A')
  })

  test('labels each multiallelic SNV from the complete source record', () => {
    const common = {
      source_variant_id: 'opaque-record',
      alt_count: 2,
      chrom: '1',
      pos: 100,
      ref: 'G',
      allele_type: 'snv',
    }
    expect(
      formatLongReadAlleleDisplay({
        ...common,
        variant_id: 'opaque-record~1',
        alt_index: 1,
        alt: 'A',
      }).label
    ).toBe('1-100-G-A — Allele 1 of 2')
    expect(
      formatLongReadAlleleDisplay({
        ...common,
        variant_id: 'opaque-record~2',
        alt_index: 2,
        alt: 'T',
      }).label
    ).toBe('1-100-G-T — Allele 2 of 2')
  })

  test('uses conventional IDs for ordinary short indels', () => {
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'source~1',
        chrom: 'chr1',
        pos: 55039879,
        ref: 'A',
        alt: 'AACTGCTG',
        allele_type: 'ins',
      }).primaryLabel
    ).toBe('1-55039879-A-AACTGCTG')
  })

  test('gives long insertions concise sequence-bearing collision-safe labels', () => {
    const makeLabel = (alt: string) =>
      formatLongReadAlleleDisplay({
        variant_id: `source-${alt.slice(-1)}~1`,
        chrom: 'chr2',
        pos: 200,
        ref: 'A',
        alt,
        allele_type: 'ins',
        allele_length: 60,
      }).primaryLabel
    const first = makeLabel(`ACGTACGT${'A'.repeat(50)}TTTTTTTA`)
    const second = makeLabel(`ACGTACGT${'C'.repeat(50)}TTTTTTTA`)
    expect(first).toMatch(/^2:200 insertion \(\+60 bp; ALT ACGTACGT…TTTTTTTA#[0-9a-f]{8}\)$/)
    expect(second).toMatch(/^2:200 insertion \(\+60 bp; ALT ACGTACGT…TTTTTTTA#[0-9a-f]{8}\)$/)
    expect(first).not.toBe(second)
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'source-A~1',
        chrom: 'chr2',
        pos: 200,
        ref: 'A',
        alt: `ACGTACGT${'A'.repeat(50)}TTTTTTTA`,
        allele_type: 'ins',
        allele_length: 60,
      }).compactLabel
    ).toBe('2:200 insertion +60 bp')
  })

  test('describes symbolic SV alleles without interpreting the source ID', () => {
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'misleading-INS-name~1',
        source_variant_id: 'misleading-INS-name',
        chrom: 'chr3',
        pos: 300,
        ref: 'N',
        alt: '<DEL>',
        allele_type: 'del',
        length: -125,
      }).primaryLabel
    ).toBe('3:300 deletion (-125 bp; ALT <DEL>)')
  })

  test('keeps TR alleles allele-specific without inventing a locus page', () => {
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'tr-record~3',
        source_variant_id: 'tr-record',
        alt_index: 3,
        alt_count: 4,
        chrom: 'chr4',
        pos: 400,
        ref: 'AC',
        alt: 'ACACAC',
        allele_type: 'trv',
        length: 4,
      }).label
    ).toBe('4-400-AC-ACACAC — Allele 3 of 4')
  })

  test('preserves canonical identity separately from every visual label', () => {
    const display = formatLongReadAlleleDisplay({
      variant_id: 'chr1-source~2',
      alt_index: 2,
      chrom: '1',
      pos: 9,
      ref: 'C',
      alt: 'T',
    })
    expect(display.canonicalId).toBe('chr1-source~2')
    expect(display.label).not.toContain('~2')
    expect(display.accessibleLabel).toContain('Canonical long-read ID: chr1-source~2')
  })
})
