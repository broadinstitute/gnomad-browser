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

  test.each([
    [
      'a long ALT',
      'chr15-90871538-G-GCGGCGGGCGGACGAGCCGGAGCCGGCGGTGGTGGCGGCGGCGGCGGCCGGGGAAGCGCGGAGGTGGCGCC',
      '15-90871538-G-GCGGCGGGCGGAC…GGAGGTGGCGCC',
    ],
    [
      'a long tandem repeat motif',
      'chr4-3113748-3113861-CAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAG',
      '4-3113748-3113861-CAGCAGCAG…CAGCAGCAGCAG',
    ],
  ])('abbreviates %s on the shared table-label budget', (_description, rawId, displayId) => {
    expect(formatLongReadVariantId(rawId)).toBe(displayId)
  })

  test('keeps the ALT-record marker after abbreviating a long allele', () => {
    expect(
      formatLongReadVariantId(
        'chr15-90871538-G-GCGGCGGGCGGACGAGCCGGAGCCGGCGGTGGTGGCGGCGGCGGCGGCCGGGGAAGCGCGGAGGTGGCGCC~2'
      )
    ).toBe('15-90871538-G-GCGGCGGGCGGAC…GGAGGTGGCGCC (Allele 2)')
  })
})

describe('formatLongReadAlleleDisplay', () => {
  test.each([
    [null, 'length-unavailable'],
    [undefined, 'length-unavailable'],
    [NaN, 'length-unavailable'],
    [Infinity, 'length-unavailable'],
    [0, '0bp'],
    [-125, '-125bp'],
    [12500, '+12500bp'],
  ])('keeps event signed length %s distinct from missing', (length, expected) => {
    const display = formatLongReadAlleleDisplay({
      chrom: 'chr5',
      pos: 500,
      allele_type: 'bnd',
      allele_length: length,
      ref: 'A',
      alt: 'AC',
    })
    expect(display.compactLabel).toBe(`5-500-BND-(${expected})`)
  })

  test.each([null, '', '  ', 'unknown', 'not_a_type', 'constructor'])(
    'does not infer unknown type %s from symbolic ALT or opaque identity',
    (type) => {
      const display = formatLongReadAlleleDisplay({
        variant_id: 'misleading-DEL~2',
        chrom: '3',
        pos: 300,
        allele_type: type,
        alt: '<DEL>',
        length: -125,
      })
      expect(display.compactLabel).toBe('3-300-VARIANT-(-125bp)')
      expect(display.canonicalId).toBe('misleading-DEL~2')
    }
  )

  test('normalizes the source token and keeps symbolic deletion source length', () => {
    expect(
      formatLongReadAlleleDisplay({
        chrom: '3',
        pos: 300,
        allele_type: ' DEL ',
        ref: 'N',
        alt: '<DEL>',
        length: -125,
      }).compactLabel
    ).toBe('3-300-DEL-(-125bp)')
    expect(
      formatLongReadAlleleDisplay({ chrom: '1', pos: 9, allele_type: 'SNP', ref: 'A', alt: 'G' })
        .compactLabel
    ).toBe('1-9-A-G')
  })

  test('bounds long conventional IDs without changing eligibility or exact sequences', () => {
    const ref = 'A'.repeat(30)
    const alt = 'C'.repeat(30)
    const full = `22-12345678-${ref}-${alt}`
    const display = formatLongReadAlleleDisplay({
      variant_id: 'exact~1',
      chrom: '22',
      pos: 12345678,
      ref,
      alt,
      allele_type: 'ins',
      alt_count: 2,
    })
    expect(display.primaryLabel).toBe(full)
    expect(display.fullCompactLabel).toBe(full)
    expect(display.compactLabel).toBe(`${full.slice(0, 27)}…${full.slice(-12)}`)
    expect(display.compactLabel).toHaveLength(40)
    expect(display.alleleLabel).toBe('Allele 1 of 2')
    expect(display.accessibleLabel).toContain(`Exact REF sequence: ${ref}`)
    expect(display.accessibleLabel).toContain(`Exact ALT sequence: ${alt}`)
    expect(display.canonicalId).toBe('exact~1')
  })

  test.each([40, 41])(
    'bounds opaque %s-character fallback without rewriting delimiters',
    (length) => {
      const source = `opaque:source_${'x'.repeat(length - 14)}`
      expect(source).toHaveLength(length)
      const display = formatLongReadAlleleDisplay({ variant_id: `${source}~2` })
      expect(display.fullCompactLabel).toBe(source)
      expect(display.compactLabel).toBe(
        length === 40 ? source : `${source.slice(0, 27)}…${source.slice(-12)}`
      )
      expect(display.canonicalId).toBe(`${source}~2`)
      expect(display.alleleLabel).toBe('Allele 2')
    }
  )

  test('abbreviation collisions leave exact identities and full labels distinct', () => {
    const first = formatLongReadAlleleDisplay({
      variant_id: `${'a'.repeat(27)}ONE${'z'.repeat(12)}~1`,
    })
    const second = formatLongReadAlleleDisplay({
      variant_id: `${'a'.repeat(27)}TWO${'z'.repeat(12)}~2`,
    })
    expect(first.compactLabel).toBe(second.compactLabel)
    expect(first.canonicalId).not.toBe(second.canonicalId)
    expect(first.fullCompactLabel).not.toBe(second.fullCompactLabel)
  })

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

  test('uses conventional IDs through 30 bases and keeps longer alleles out of compact labels', () => {
    const thirtyBaseAlt = `A${'C'.repeat(29)}`
    expect(thirtyBaseAlt).toHaveLength(30)
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'source~1',
        chrom: 'chr1',
        pos: 55039879,
        ref: 'A',
        alt: thirtyBaseAlt,
        allele_type: 'ins',
      }).primaryLabel
    ).toBe(`1-55039879-A-${thirtyBaseAlt}`)

    const thirtyOneBaseRef = `G${'T'.repeat(30)}`
    const thirtyOneBaseAlt = `A${'C'.repeat(30)}`
    const display = formatLongReadAlleleDisplay({
      variant_id: 'source~2',
      chrom: 'chr1',
      pos: 55039880,
      ref: thirtyOneBaseRef,
      alt: thirtyOneBaseAlt,
      allele_type: 'snv',
    })
    expect(display.compactLabel).toBe('1-55039880-SNV-(0bp)')
    expect(display.compactLabel).not.toContain(thirtyOneBaseRef)
    expect(display.compactLabel).not.toContain(thirtyOneBaseAlt)
    expect(display.accessibleLabel).toContain(`Exact REF sequence: ${thirtyOneBaseRef}`)
    expect(display.accessibleLabel).toContain(`Exact ALT sequence: ${thirtyOneBaseAlt}`)
  })

  test('formats the reported literal +49 bp tandem duplication as a compact event', () => {
    const alt = 'CGCTGTGGGGCTGCATGGGGTGGGGAGGAACGGGGCTGGGGTATGGCTGG'
    const display = formatLongReadAlleleDisplay({
      variant_id: 'chr22-50715763-DUP_TANDEM-49~1',
      source_variant_id: 'chr22-50715763-DUP_TANDEM-49',
      alt_index: 1,
      alt_count: 1,
      chrom: 'chr22',
      pos: 50715763,
      ref: 'C',
      alt,
      allele_type: 'dup_tandem',
      allele_length: 49,
    })

    expect(alt).toHaveLength(50)
    expect(display.compactLabel).toBe('22-50715763-DUP_TANDEM-(+49bp)')
    expect(display.primaryLabel).toMatch(
      /^22:50715763 tandem duplication \(\+49 bp; ALT CGCTGTGG…ATGGCTGG#[0-9a-f]{8}\)$/
    )
    expect(display.compactLabel).not.toContain(alt)
    expect(display.accessibleLabel).toContain(`Exact ALT sequence: ${alt}`)
    expect(display.accessibleLabel).toMatch(/ALT sequence digest: [0-9a-f]{8}/)
    expect(display.accessibleLabel).toContain('Source ALT 1 of 1')
    expect(display.canonicalId).toBe('chr22-50715763-DUP_TANDEM-49~1')
  })

  test.each([
    ['dup', 'duplication'],
    ['complex_dup', 'complex duplication'],
    ['inv', 'inversion'],
    ['alu_ins', 'Alu insertion'],
    ['bnd', 'breakend'],
    ['ctx', 'translocation'],
    ['cpx', 'complex variant'],
  ])('keeps literal structural/event type %s compact below the sequence threshold', (type) => {
    const display = formatLongReadAlleleDisplay({
      variant_id: `source-${type}~1`,
      chrom: 'chr5',
      pos: 500,
      ref: 'A',
      alt: 'AC',
      allele_type: type,
      allele_length: 1,
    })
    expect(display.compactLabel).toBe(`5-500-${type.toUpperCase()}-(+1bp)`)
    expect(display.primaryLabel).not.toBe('5-500-A-AC')
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
    expect(first).toMatch(/^2:200 insertion \(\+65 bp; ALT ACGTACGT…TTTTTTTA#[0-9a-f]{8}\)$/)
    expect(second).toMatch(/^2:200 insertion \(\+65 bp; ALT ACGTACGT…TTTTTTTA#[0-9a-f]{8}\)$/)
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
    ).toBe('2-200-INS-(+65bp)')
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'source-A~1',
        chrom: 'chr2',
        pos: 200,
        ref: 'A',
        alt: `ACGTACGT${'A'.repeat(50)}TTTTTTTA`,
        allele_type: 'ins',
        allele_length: 60,
      }).accessibleLabel
    ).toContain('Source length +60 bp disagrees with literal ALT−REF +65 bp')
  })

  test('uses source event length when literal structural ALT length disagrees', () => {
    expect(
      formatLongReadAlleleDisplay({
        variant_id: 'structural-dup~1',
        chrom: '2',
        pos: 250,
        ref: 'A',
        alt: 'AC',
        allele_type: 'dup',
        allele_length: 123,
      }).compactLabel
    ).toBe('2-250-DUP-(+123bp)')
  })

  test('keeps same-length structural alleles collision-safe outside compact tables', () => {
    const display = (alt: string) =>
      formatLongReadAlleleDisplay({
        variant_id: `dup-${alt}~1`,
        chrom: '2',
        pos: 260,
        ref: 'A',
        alt,
        allele_type: 'dup_tandem',
        allele_length: 20,
      })
    const first = display(`ACGTACGT${'A'.repeat(20)}TTTTTTTA`)
    const second = display(`ACGTACGT${'C'.repeat(20)}TTTTTTTA`)
    expect(first.compactLabel).toBe(second.compactLabel)
    expect(first.primaryLabel).not.toBe(second.primaryLabel)
    expect(first.accessibleLabel).not.toBe(second.accessibleLabel)
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
    ).toBe('4:400 tandem-repeat allele (+4 bp; ALT ACACAC) — Allele 3 of 4')
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
