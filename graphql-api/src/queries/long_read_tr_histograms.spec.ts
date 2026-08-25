import { jest } from '@jest/globals'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  getY1AncillaryClickhouseClient: () => ({ query: (...args: any[]) => mockQuery(...args) }),
}))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))

// eslint-disable-next-line import/first
import {
  fetchLongReadTrRepeatCountPlots,
  longReadTrHistogramCacheKey,
  MAX_LONG_READ_TR_HISTOGRAM_BYTES,
} from './long_read_tr_histograms'

const component = { chrom: '4', start0: 100, end0: 115, motif: 'AAAAG' }
const locus = (overrides: Record<string, unknown> = {}) => ({
  reference_genome: 'GRCh38',
  lr_cohort: 'hgsvc_hprc' as const,
  primary_database: 'gnomad_lr_y1_primary',
  source_run_id: 'primary-run',
  components: [component],
  source_records: [
    {
      source_variant_id: 'chr4-100-TRV-1',
      task_id: 'primary-task',
      attempt_id: 'primary-attempt',
      an: 4,
    },
  ],
  ...overrides,
})

const route = {
  modality: 'str_histogram',
  cohort: 'hgsvc_hprc',
  database: 'gnomad_lr_y1_str',
  run_id: 'ancillary-run',
  receipt_path: '/receipt.json',
  receipt: { source_format: 'str_completion' },
} as any

const mapping = (overrides: Record<string, unknown> = {}) => ({
  ancillary_run_id: 'ancillary-run',
  primary_database: 'gnomad_lr_y1_primary',
  primary_run_id: 'primary-run',
  primary_task_id: 'primary-task',
  primary_attempt_id: 'primary-attempt',
  y1_source_variant_id: 'chr4-100-TRV-1',
  chrom: 'chr4',
  position: 100,
  source_end: 115,
  motif: 'AAAAG',
  raw_match_count: 1,
  mapping_status: 'available_exact',
  ...overrides,
})

const row = (overrides: Record<string, unknown> = {}) => ({
  ancillary_run_id: 'ancillary-run',
  primary_database: 'gnomad_lr_y1_primary',
  primary_run_id: 'primary-run',
  primary_task_id: 'primary-task',
  primary_attempt_id: 'primary-attempt',
  y1_source_variant_id: 'chr4-100-TRV-1',
  chrom: 'chr4',
  position: 100,
  source_end: 115,
  motif: 'AAAAG',
  allele_size_histogram: '10x:2,11x:2',
  biallelic_histogram: '10/11:2',
  min_repeats: 10,
  mode_repeats: 10,
  mean_repeats: 10.5,
  stdev_repeats: 0.5,
  median_repeats: 10.5,
  p99_repeats: 11,
  max_repeats: 11,
  unique_allele_lengths: 2,
  num_called_alleles: 4,
  populations: {
    'AlleleSizeHistogram:afr:female': '10x:2,11x:2',
    'BiallelicHistogram:afr:female': '10/11:2',
  },
  mapping_status: 'available_exact',
  ...overrides,
})

const result = (rows: any[]) => Promise.resolve({ json: async () => rows })

describe('exact long-read TR locus histogram contract', () => {
  beforeEach(() => mockQuery.mockReset())

  test('queries every immutable identity field and parses exact called-count plots', async () => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row()]))
    const plots = await fetchLongReadTrRepeatCountPlots(locus(), route)

    expect(plots).toMatchObject({
      status: 'AVAILABLE_EXACT',
      repeat_unit: 'AAAAG',
      unit: 'MOTIF_REPEAT_COUNT',
      identity: {
        ancillary_run_id: 'ancillary-run',
        primary_run_id: 'primary-run',
        primary_task_id: 'primary-task',
        primary_attempt_id: 'primary-attempt',
        source_variant_id: 'chr4-100-TRV-1',
        component,
      },
      overall: { called_alleles: 4, called_diploid_genotypes: 2, no_call_rate: null },
      callability: [
        {
          ancestry_group: 'afr',
          sex: 'XX',
          called_alleles: 4,
          called_diploid_genotypes: 2,
        },
      ],
      max_repunits: 11,
      interaction: {
        interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES',
        reason: expect.stringContaining('aggregate count bins only'),
      },
    })
    const requests = mockQuery.mock.calls.map(([request]) => request as any)
    expect(requests[0].query).toContain('FROM lr_y1_str_histogram_mapping')
    expect(requests[1].query).toContain('FROM lr_y1_str_histograms')
    for (const predicate of [
      'ancillary_run_id = {ancillaryRunId:String}',
      "release = 'y1'",
      'cohort = {cohort:String}',
      "reference_genome = 'GRCh38'",
      "modality = 'str_histogram'",
      'primary_database = {primaryDatabase:String}',
      'primary_run_id = {primaryRunId:String}',
      'primary_task_id = {primaryTaskId:String}',
      'primary_attempt_id = {primaryAttemptId:String}',
      'y1_source_variant_id = {sourceVariantId:String}',
      'chrom = {chrom:String}',
      'position = {start0:UInt32}',
      'source_end = {end0:UInt32}',
      'motif = {motif:String}',
      'LIMIT 2',
    ]) {
      for (const request of requests) expect(request.query).toContain(predicate)
    }
    expect(requests[1].query).toContain("mapping_status = 'available_exact'")
    expect(requests[1].query_params).toEqual({
      ancillaryRunId: 'ancillary-run',
      cohort: 'hgsvc_hprc',
      primaryDatabase: 'gnomad_lr_y1_primary',
      primaryRunId: 'primary-run',
      primaryTaskId: 'primary-task',
      primaryAttemptId: 'primary-attempt',
      sourceVariantId: 'chr4-100-TRV-1',
      chrom: 'chr4',
      start0: 100,
      end0: 115,
      motif: 'AAAAG',
    })
  })

  test('returns typed unavailable states without weakening identity', async () => {
    mockQuery.mockImplementationOnce(() => result([]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).resolves.toMatchObject({
      status: 'UNAVAILABLE_NO_EXACT_MAPPING',
      allele_size_distribution: [],
      interaction: { interaction_status: 'UNAVAILABLE_PLOTS' },
    })

    await expect(fetchLongReadTrRepeatCountPlots(locus(), null)).resolves.toMatchObject({
      status: 'UNAVAILABLE_ANCILLARY',
    })
    for (const cohort of ['hgsvc_hprc', 'aou'] as const) {
      // Sequential expectations keep the shared query mock deterministic.
      // eslint-disable-next-line no-await-in-loop
      await expect(
        fetchLongReadTrRepeatCountPlots(
          locus({ lr_cohort: cohort, components: [component, component] }),
          { ...route, cohort }
        )
      ).resolves.toMatchObject({ status: 'UNAVAILABLE_COMPOUND_LOCUS' })
    }
    await expect(
      fetchLongReadTrRepeatCountPlots(
        locus({ source_records: [locus().source_records[0], {}] }),
        route
      )
    ).resolves.toMatchObject({ status: 'UNAVAILABLE_MULTIPLE_SOURCE_RECORDS' })
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  test.each([
    ['hgsvc_hprc', 582, 291],
    ['aou', 2046, 1023],
  ] as const)(
    'returns verified ordinary-locus called counts for %s',
    async (cohort, alleles, genotypes) => {
      const targetRow = {
        allele_size_histogram: `10x:${alleles}`,
        biallelic_histogram: `10/10:${genotypes}`,
        min_repeats: 10,
        mode_repeats: 10,
        mean_repeats: 10,
        stdev_repeats: 0,
        median_repeats: 10,
        p99_repeats: 10,
        max_repeats: 10,
        unique_allele_lengths: 1,
        num_called_alleles: alleles,
        populations: {
          'AlleleSizeHistogram:afr:unknown': `10x:${alleles}`,
          'BiallelicHistogram:afr:unknown': `10/10:${genotypes}`,
        },
      }
      mockQuery
        .mockImplementationOnce(() => result([mapping()]))
        .mockImplementationOnce(() => result([row(targetRow)]))
      await expect(
        fetchLongReadTrRepeatCountPlots(
          locus({
            lr_cohort: cohort,
            source_records: [{ ...locus().source_records[0], an: alleles }],
          }),
          { ...route, cohort }
        )
      ).resolves.toMatchObject({
        status: 'AVAILABLE_EXACT',
        overall: { called_alleles: alleles, called_diploid_genotypes: genotypes },
      })
    }
  )

  test.each([
    ['ATXN1', '12x:2,20x:2', [21, 35], 12, 20],
    ['RFC1', '5x:2,6x:2', [11, 100], 5, 6],
  ])(
    'keeps %s static and interaction-unavailable instead of joining unrelated source MC counts',
    async (_locusName, alleleHistogram, primaryMcCounts, minRepeats, maxRepeats) => {
      const histogramRow = row({
        allele_size_histogram: alleleHistogram,
        biallelic_histogram: `${minRepeats}/${maxRepeats}:2`,
        min_repeats: minRepeats,
        mode_repeats: minRepeats,
        mean_repeats: (minRepeats + maxRepeats) / 2,
        stdev_repeats: 1,
        median_repeats: (minRepeats + maxRepeats) / 2,
        p99_repeats: maxRepeats,
        max_repeats: maxRepeats,
        populations: {
          'AlleleSizeHistogram:afr:female': alleleHistogram,
          'BiallelicHistogram:afr:female': `${minRepeats}/${maxRepeats}:2`,
        },
      })
      mockQuery
        .mockImplementationOnce(() => result([mapping()]))
        .mockImplementationOnce(() => result([histogramRow]))

      const plots = await fetchLongReadTrRepeatCountPlots(
        locus({ primary_exact_alt_source_mc_counts: primaryMcCounts }),
        route
      )

      expect(plots.status).toBe('AVAILABLE_EXACT')
      expect(plots.allele_size_distribution).not.toHaveLength(0)
      expect(plots.genotype_distribution).not.toHaveLength(0)
      expect(plots.interaction).toEqual({
        interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES',
        reason:
          'The admitted histogram source contains aggregate count bins only; exact contributor identities are unavailable.',
      })
      expect(JSON.stringify(plots)).not.toContain('primary_exact_alt_source_mc_counts')
    }
  )

  test('validates one exact mapping row before accepting a canonical row', async () => {
    mockQuery.mockImplementationOnce(() => result([mapping(), mapping()]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'multiple mapping rows'
    )

    mockQuery.mockImplementationOnce(() =>
      result([mapping({ mapping_status: 'unavailable_ambiguous', raw_match_count: 2 })])
    )
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).resolves.toMatchObject({
      status: 'UNAVAILABLE_NO_EXACT_MAPPING',
      reason_code: 'MAPPING_NOT_AVAILABLE_EXACT',
    })

    mockQuery.mockImplementationOnce(() => result([mapping({ y1_source_variant_id: 'collision' })]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'does not match the caller identity'
    )
  })

  test('fails closed on duplicate rows and exact-key mismatches at the same position', async () => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row(), row()]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'multiple canonical rows'
    )

    for (const mismatch of [
      { y1_source_variant_id: 'other-source' },
      { source_end: 116 },
      { motif: 'CAA' },
      { primary_run_id: 'other-run' },
      { primary_task_id: 'other-task' },
      { primary_attempt_id: 'other-attempt' },
    ]) {
      mockQuery
        .mockImplementationOnce(() => result([mapping()]))
        .mockImplementationOnce(() => result([row(mismatch)]))
      // Sequential expectations keep the shared query mock deterministic.
      // eslint-disable-next-line no-await-in-loop
      await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
        'does not match the caller identity'
      )
    }
  })

  test.each([
    { allele_size_histogram: '10.5x:2,11x:2' },
    { allele_size_histogram: '10x:-1,11x:5' },
    { allele_size_histogram: '10x:2,10x:2' },
    { biallelic_histogram: '11/10:2' },
    { num_called_alleles: 5 },
    { unique_allele_lengths: 3 },
    {
      populations: {
        'AlleleSizeHistogram:afr:female': '10x:1,11x:3',
        'BiallelicHistogram:afr:female': '10/11:2',
      },
    },
  ])('rejects malformed or count-mismatched bins %#', async (mismatch) => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row(mismatch)]))
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow(
      'TR_HISTOGRAM_INVARIANT'
    )
  })

  test('rejects source-AN mismatches and payloads over the hard cap', async () => {
    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() => result([row()]))
    await expect(
      fetchLongReadTrRepeatCountPlots(
        locus({ source_records: [{ ...locus().source_records[0], an: 6 }] }),
        route
      )
    ).rejects.toThrow('source AN')

    mockQuery
      .mockImplementationOnce(() => result([mapping()]))
      .mockImplementationOnce(() =>
        result([row({ ignored: 'x'.repeat(MAX_LONG_READ_TR_HISTOGRAM_BYTES) })])
      )
    await expect(fetchLongReadTrRepeatCountPlots(locus(), route)).rejects.toThrow('200 KiB cap')
  })

  test('cache identity changes across ancillary and complete primary identity', () => {
    const base = {
      ancillaryRunId: 'ancillary-run',
      ancillaryDatabase: 'gnomad_lr_y1_str',
      cohort: 'hgsvc_hprc' as const,
      primaryDatabase: 'gnomad_lr_y1_primary',
      primaryRunId: 'primary-run',
      primaryTaskId: 'primary-task',
      primaryAttemptId: 'primary-attempt',
      sourceVariantId: 'chr4-100-TRV-1',
      sourceAn: 4,
      component,
    }
    const original = longReadTrHistogramCacheKey(base)
    for (const changed of [
      { ancillaryRunId: 'other-ancillary' },
      { primaryRunId: 'other-primary' },
      { primaryTaskId: 'other-task' },
      { primaryAttemptId: 'other-attempt' },
      { sourceVariantId: 'other-source' },
      { component: { ...component, motif: 'CAA' } },
    ]) {
      expect(longReadTrHistogramCacheKey({ ...base, ...changed })).not.toBe(original)
    }
  })
})
