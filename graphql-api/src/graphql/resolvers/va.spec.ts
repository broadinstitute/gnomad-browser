import { describe, expect, test } from '@jest/globals'

import {
  resolveVAExome,
  resolveVAGenome,
  resolveVAAllele,
  Allele as VAAllele,
  CohortAlleleFrequency,
} from './va'

const alleleEsDocument = {
  vrs: {
    ref: {
      allele_id: 'ga4gh:SQ.IAmTheRefStateID',
      start: 123,
      end: 234,
      state: 'G',
    },
    alt: {
      allele_id: 'ga4gh:SQ.IAmTheAltStateID',
      start: 124,
      end: 235,
      state: 'A',
    },
  },
}

const expectedAllele: VAAllele = {
  _id: 'ga4gh:SQ.IAmTheAltStateID',
  type: 'Allele',
  location: {
    _id: 'ga4gh:VSL.OogSNIt-1Z7HF4tbdm45IDLYc7-oSE2Y',
    type: 'SequenceLocation',
    sequence_id: '2mN7PzLXx-QQq2GVIODPRSkWmlwybsv0',
    interval: {
      type: 'SequenceInterval',
      start: { type: 'Number', value: 124 },
      end: { type: 'Number', value: 235 },
    },
  },
  state: {
    type: 'LiteralSequenceExpression',
    sequence: 'A',
  },
}

describe('resolveVAAllele', () => {
  test('parses a single allele correctly', async () => {
    const resolved = await resolveVAAllele(alleleEsDocument, null, null)
    expect(resolved).toEqual(expectedAllele)
  })
})

describe('resolveVACohortAlleleFrequency', () => {
  const exomeEsDocument = {
    ac: 5,
    an: 100,
    hemizygote_count: 2,
    homozygote_count: 3,
    faf95: { popmax: 0.123, popmax_population: 'afr' },
    ancestry_groups: [],
    filters: ['AC0'],
    flags: ['monoallelic'],
    quality_metrics: {
      allele_balance: {
        alt: { bin_freq: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
      },
    },
  }

  const genomeEsDocument = {
    ac: 18,
    an: 200,
    hemizygote_count: 4,
    homozygote_count: 5,
    faf95: { popmax: 0.234, popmax_population: 'eas' },
    filters: ['AC0'],
    ancestry_groups: [],
    flags: ['monoallelic'],
    quality_metrics: {
      allele_balance: {
        alt: {
          bin_freq: [
            100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
            117, 118, 119,
          ],
        },
      },
    },
  }

  const variantESDocument = {
    ...alleleEsDocument,
    variant_id: '1-123-G-A',
    exome: exomeEsDocument,
    genome: genomeEsDocument,
    joint: { fafmax: { faf95_max: 0.234, faf95_max_gen_anc: 'amr' } },
    coverage: { exome: { mean: 0.345, over_20: 0.456 }, genome: { mean: 0.111, over_20: 0.222 } },
    flags: ['lcr', 'lc_lof', 'lof_flag'],
  }

  test('parses a single CohortAlleleFrequency exome correctly', async () => {
    const resolved = await resolveVAExome(variantESDocument, null, null)
    const expected: CohortAlleleFrequency[] = [
      {
        id: 'gnomad4:1-123-G-A',
        label: 'Exome Cohort Allele Frequency for 1-123-G-A',
        type: 'CohortAlleleFrequency',
        focusAllele: expectedAllele,
        derivedFrom: {
          id: 'gnomad4.1.0',
          type: 'DataSet',
          label: 'gnomAD v4.1.0',
          version: '4.1.0',
        },
        focusAlleleCount: 5,
        locusAlleleCount: 100,
        alleleFrequency: 0.05,
        cohort: { id: 'ALL', label: 'Exome', characteristics: null },
        ancillaryResults: {
          grpMaxFAF95: { frequency: 0.123, confidenceInterval: 0.95, groupId: 'afr' },
          jointGrpMaxFAF95: { frequency: 0.234, confidenceInterval: 0.95, groupId: 'amr' },
          homozygotes: 3,
          hemizygotes: 2,
        },
        subcohortFrequency: [],
        qualityMeasures: {
          meanDepth: 0.345,
          fractionCoverage20x: 0.456,
          qcFilters: ['AC0'],
          monoallelic: true,
          lowComplexityRegion: true,
          lowConfidenceLossOfFunctionError: true,
          lossOfFunctionWarning: true,
          heterozygousSkewedAlleleCount: 37,
        },
      },
    ]

    expect(resolved).toEqual(expected)
  })

  test('parses a single CohortAlleleFrequency genome correctly', async () => {
    const resolved = await resolveVAGenome(variantESDocument, null, null)
    const expected: CohortAlleleFrequency[] = [
      {
        id: 'gnomad4:1-123-G-A',
        label: 'Genome Cohort Allele Frequency for 1-123-G-A',
        type: 'CohortAlleleFrequency',
        focusAllele: expectedAllele,
        derivedFrom: {
          id: 'gnomad4.1.0',
          type: 'DataSet',
          label: 'gnomAD v4.1.0',
          version: '4.1.0',
        },
        focusAlleleCount: 18,
        locusAlleleCount: 200,
        alleleFrequency: 0.09,
        cohort: { id: 'ALL', label: 'Genome', characteristics: null },
        ancillaryResults: {
          grpMaxFAF95: { frequency: 0.234, confidenceInterval: 0.95, groupId: 'eas' },
          jointGrpMaxFAF95: { frequency: 0.234, confidenceInterval: 0.95, groupId: 'amr' },
          homozygotes: 5,
          hemizygotes: 4,
        },
        subcohortFrequency: [],
        qualityMeasures: {
          meanDepth: 0.111,
          fractionCoverage20x: 0.222,
          monoallelic: true,
          qcFilters: ['AC0'],
          lowComplexityRegion: true,
          lowConfidenceLossOfFunctionError: true,
          lossOfFunctionWarning: true,
          heterozygousSkewedAlleleCount: 237,
        },
      },
    ]

    expect(resolved).toEqual(expected)
  })

  test('gracefully handles missing exome or genome', async () => {
    const exomeOnlyDocument = { ...variantESDocument, genome: null }
    const genomeOnlyDocument = { ...variantESDocument, exome: null }
    expect(await resolveVAExome(genomeOnlyDocument, null, null)).toBeNull()
    expect(await resolveVAGenome(exomeOnlyDocument, null, null)).toBeNull()
  })

  test('has the correct subcohortAlleleFrequency when there are multiple CAFs', async () => {
    // Shuffled order of IDs is intentional here to better test sorting
    const subcohortIds = [
      'eur_XY',
      'XY',
      'ami_XX',
      'amr',
      'XX',
      'ami',
      'ami_XY',
      'amr_XX',
      'eur',
      'amr_XY',
      'eur_XX',
    ]
    const subcohortDocuments = subcohortIds.map((subcohortId) => ({
      ...exomeEsDocument,
      id: subcohortId,
    }))

    const fullDocument = {
      ...variantESDocument,
      exome: { ...exomeEsDocument, ancestry_groups: subcohortDocuments },
      genome: { ...genomeEsDocument, ancestry_groups: subcohortDocuments },
    }

    const exomeResolved = await resolveVAExome(fullDocument, null, null)
    const genomeResolved = await resolveVAGenome(fullDocument, null, null)

    const results: CohortAlleleFrequency[][] = [exomeResolved!, genomeResolved!]

    results.forEach((resolved: CohortAlleleFrequency[]) => {
      expect(resolved && resolved.length === subcohortIds.length + 1).toEqual(true)

      const subcohortMap: Record<string, string[]> = resolved!.reduce(
        (acc, cohort) => ({
          ...acc,
          [cohort.id]: cohort.subcohortFrequency.map((subcohort) => subcohort.id),
        }),
        {}
      )

      expect(subcohortMap['gnomad4:1-123-G-A']!.sort()).toEqual(
        subcohortIds.map((cohortId) => `gnomad4:1-123-G-A.${cohortId}`).sort()
      )

      expect(subcohortMap['gnomad4:1-123-G-A.XX'].sort()).toEqual([
        'gnomad4:1-123-G-A.ami_XX',
        'gnomad4:1-123-G-A.amr_XX',
        'gnomad4:1-123-G-A.eur_XX',
      ])

      expect(subcohortMap['gnomad4:1-123-G-A.XY'].sort()).toEqual([
        'gnomad4:1-123-G-A.ami_XY',
        'gnomad4:1-123-G-A.amr_XY',
        'gnomad4:1-123-G-A.eur_XY',
      ])

      expect(subcohortMap['gnomad4:1-123-G-A.ami'].sort()).toEqual([
        'gnomad4:1-123-G-A.ami_XX',
        'gnomad4:1-123-G-A.ami_XY',
      ])

      expect(subcohortMap['gnomad4:1-123-G-A.amr'].sort()).toEqual([
        'gnomad4:1-123-G-A.amr_XX',
        'gnomad4:1-123-G-A.amr_XY',
      ])

      expect(subcohortMap['gnomad4:1-123-G-A.eur'].sort()).toEqual([
        'gnomad4:1-123-G-A.eur_XX',
        'gnomad4:1-123-G-A.eur_XY',
      ])

      expect(subcohortMap['gnomad4:1-123-G-A.ami_XX']).toEqual([])
      expect(subcohortMap['gnomad4:1-123-G-A.ami_XY']).toEqual([])
      expect(subcohortMap['gnomad4:1-123-G-A.amr_XX']).toEqual([])
      expect(subcohortMap['gnomad4:1-123-G-A.amr_XY']).toEqual([])
      expect(subcohortMap['gnomad4:1-123-G-A.eur_XX']).toEqual([])
      expect(subcohortMap['gnomad4:1-123-G-A.eur_XY']).toEqual([])
    })
  })
})
