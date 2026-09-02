jest.mock('./short-tandem-repeat-queries', () => ({
  fetchBoundedShortTandemRepeatCatalog: jest.fn(),
  fetchShortTandemRepeatById: jest.fn(),
  fetchShortTandemRepeatDetailReceipt: jest.fn(),
}))

// eslint-disable-next-line import/first
import {
  admitShortReadDistributions,
  longReadTrShortReadDistributionArtifactForTests,
  resolveLongReadTrShortReadDistributions,
  shortReadDistributionReceipt,
} from './long_read_tr_short_read_distributions'
// eslint-disable-next-line import/first
import { fetchShortTandemRepeatDetailReceipt } from './short-tandem-repeat-queries'

const artifact: any = longReadTrShortReadDistributionArtifactForTests
const fetchDetail = fetchShortTandemRepeatDetailReceipt as jest.Mock

const exactContext = (id: string, cohort = 'hgsvc_hprc') => {
  const row = artifact.rows.find((item: any) => item.short.id === id)
  const result = row.cohorts[cohort]
  if (result.status !== 'EXACT_UNIQUE') throw new Error(`missing exact fixture ${cohort}/${id}`)
  return { row, result, candidate: result.candidates[0], cohort }
}

const recordFor = (id: string, motif: string) => ({
  ...exactContext(id).row.short,
  allele_size_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      repunit: motif,
      quality_description: 'high',
      q_score: 1,
      sample_ids: ['must-not-escape'],
      distribution: [{ repunit_count: 20, frequency: 2, carriers: ['must-not-escape'] }],
    },
  ],
  genotype_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      short_allele_repunit: motif,
      long_allele_repunit: motif,
      quality_description: 'high',
      q_score: 1,
      sample_ids: ['must-not-escape'],
      distribution: [
        {
          short_allele_repunit_count: 20,
          long_allele_repunit_count: 21,
          frequency: 1,
          carriers: ['must-not-escape'],
        },
      ],
    },
  ],
})

const sourceForContext =
  ({ result, cohort, candidate }: any) =>
  async () => ({
    database: result.source_database,
    release: result.source_release,
    cohort,
    reference_genome: 'GRCh38',
    chrom: `chr${candidate.matched_component.chrom}`,
    load_scope: 'full_chromosome',
    run_id: result.source_run_id,
    state: 'accepted_tasks' as const,
    metadata_run_id: null,
    carriers_available: cohort === 'hgsvc_hprc',
    accepted_task_attempts: [{ task_id: 'task-1', attempt_id: 'attempt-1' }],
    accepted_task_attempt_digest: 'a'.repeat(64),
  })

const withReceipt = async (row: any, record: any, run: () => Promise<void>) => {
  const original = row.distribution_receipt
  Object.assign(row, { distribution_receipt: shortReadDistributionReceipt(record) })
  try {
    await run()
  } finally {
    Object.assign(row, { distribution_receipt: original })
  }
}

describe('bounded exact short-read distributions for LR contexts', () => {
  beforeEach(() => fetchDetail.mockReset())

  test.each([
    ['HTT', 'CAG'],
    ['ATXN1', 'TGC'],
  ])('admits exact %s main-region distributions in stored %s orientation', async (id, motif) => {
    const context = exactContext(id)
    const record = recordFor(id, motif)
    await withReceipt(context.row, record, async () => {
      fetchDetail.mockResolvedValue({
        record,
        concrete_index: artifact.distribution.concrete_index,
      })
      const getSource = jest.fn(sourceForContext(context))
      const result = await resolveLongReadTrShortReadDistributions(
        { id: context.candidate.canonical_id, lr_cohort: context.cohort },
        {},
        getSource
      )
      expect(result).toEqual(
        expect.objectContaining({
          status: 'AVAILABLE',
          short_id: id,
          reference_repeat_unit: motif,
          matched_component: expect.objectContaining({ motif }),
          allele: expect.objectContaining({ status: 'AVAILABLE', returned_bins: 1 }),
          genotype: expect.objectContaining({ status: 'AVAILABLE', returned_bins: 1 }),
        })
      )
      expect(result.allele.distributions[0].repunit).toBe(motif)
      expect(result.genotype.distributions[0]).toEqual(
        expect.objectContaining({
          short_allele_repunit: motif,
          long_allele_repunit: motif,
        })
      )
      expect(JSON.stringify(result)).not.toMatch(/sample_ids|must-not-escape|carriers/)
      expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(2 * 1024 * 1024)
      expect(getSource).toHaveBeenCalledTimes(1)
      expect(fetchDetail).toHaveBeenCalledTimes(1)
    })
  })

  test('uses one O(1) detail GET and the five-minute digest-keyed cache without LR scans', async () => {
    const context = exactContext('HTT')
    const record = recordFor('HTT', 'CAG')
    await withReceipt(context.row, record, async () => {
      fetchDetail.mockResolvedValue({
        record,
        concrete_index: artifact.distribution.concrete_index,
      })
      const getSource = jest.fn(sourceForContext(context))
      const esClient = {}
      const args = { id: context.candidate.canonical_id, lr_cohort: context.cohort }
      await resolveLongReadTrShortReadDistributions(args, esClient, getSource)
      await resolveLongReadTrShortReadDistributions(args, esClient, getSource)
      expect(fetchDetail).toHaveBeenCalledTimes(1)
      expect(fetchDetail).toHaveBeenCalledWith(esClient, 'gnomad_r4', 'HTT')
      expect(getSource).toHaveBeenCalledTimes(2)
    })
  })

  test('rejects stale LR source provenance before the catalog GET', async () => {
    const context = exactContext('ATXN1')
    const result = await resolveLongReadTrShortReadDistributions(
      { id: context.candidate.canonical_id, lr_cohort: context.cohort },
      {},
      async () => ({ ...(await sourceForContext(context)()), run_id: 'stale-run' })
    )
    expect(result).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'SOURCE_PROVENANCE_MISMATCH' })
    )
    expect(fetchDetail).not.toHaveBeenCalled()
  })

  test('rejects a mismatched exact main reference region before the catalog GET', async () => {
    const context = exactContext('HTT')
    const original = context.row.short.main_reference_region
    Object.assign(context.row.short, {
      main_reference_region: { ...original, start: original.start + 1 },
    })
    try {
      const result = await resolveLongReadTrShortReadDistributions(
        { id: context.candidate.canonical_id, lr_cohort: context.cohort },
        {},
        sourceForContext(context)
      )
      expect(result).toEqual(
        expect.objectContaining({
          status: 'UNAVAILABLE',
          reason_code: 'EXACT_MAIN_COMPONENT_MISMATCH',
        })
      )
      expect(fetchDetail).not.toHaveBeenCalled()
    } finally {
      Object.assign(context.row.short, { main_reference_region: original })
    }
  })

  test('rejects a mismatched concrete catalog source for both parts', async () => {
    const context = exactContext('HTT')
    const record = recordFor('HTT', 'CAG')
    await withReceipt(context.row, record, async () => {
      fetchDetail.mockResolvedValue({ record, concrete_index: 'stale-index' })
      const result = await resolveLongReadTrShortReadDistributions(
        { id: context.candidate.canonical_id, lr_cohort: context.cohort },
        {},
        sourceForContext(context)
      )
      expect(result.reason_code).toBe('DISTRIBUTION_PROVENANCE_MISMATCH')
      expect(result.allele.status).toBe('UNAVAILABLE')
      expect(result.genotype.status).toBe('UNAVAILABLE')
    })
  })

  test('fails a stale distribution digest closed without returning either array', () => {
    const record = recordFor('HTT', 'CAG')
    const receipt = shortReadDistributionReceipt(record)!
    const stale = {
      ...record,
      allele_size_distribution: record.allele_size_distribution.map((row: any) => ({
        ...row,
        distribution: [{ repunit_count: 99, frequency: 1 }],
      })),
    }
    const result = admitShortReadDistributions(stale, 'CAG', receipt)
    expect(result.reason_code).toBe('DISTRIBUTION_RECEIPT_MISMATCH')
    expect(result.allele.distributions).toEqual([])
    expect(result.genotype.distributions).toEqual([])
  })

  test('rejects malformed aggregate items independently without exposing raw rows', () => {
    const record = recordFor('HTT', 'CAG')
    record.allele_size_distribution[0].distribution[0].frequency = 0
    const result = admitShortReadDistributions(record, 'CAG', shortReadDistributionReceipt(record)!)
    expect(result.allele).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'INVALID_ALLELE_SOURCE_ITEM' })
    )
    expect(result.genotype.status).toBe('AVAILABLE')
  })

  test('fails missing exact allele and genotype identities independently', () => {
    const alleleMissing = recordFor('HTT', 'CAG')
    alleleMissing.allele_size_distribution[0].repunit = 'CCG'
    const alleleResult = admitShortReadDistributions(
      alleleMissing,
      'CAG',
      shortReadDistributionReceipt(alleleMissing)!
    )
    expect(alleleResult.allele).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'EXACT_ALLELE_MOTIF_MISSING' })
    )
    expect(alleleResult.genotype.status).toBe('AVAILABLE')

    const genotypeMissing = recordFor('ATXN1', 'TGC')
    genotypeMissing.genotype_distribution[0].long_allele_repunit = 'CAG'
    const genotypeResult = admitShortReadDistributions(
      genotypeMissing,
      'TGC',
      shortReadDistributionReceipt(genotypeMissing)!
    )
    expect(genotypeResult.allele.status).toBe('AVAILABLE')
    expect(genotypeResult.genotype).toEqual(
      expect.objectContaining({
        status: 'UNAVAILABLE',
        reason_code: 'EXACT_GENOTYPE_MOTIF_PAIR_MISSING',
      })
    )
  })

  test('fails an oversized allele part independently and never truncates bins', () => {
    const record = recordFor('HTT', 'CAG')
    record.allele_size_distribution[0].distribution = Array.from({ length: 100 }, (_, index) => ({
      repunit_count: index,
      frequency: 1,
    }))
    const originalLimit = artifact.distribution.limits.max_serialized_bytes
    artifact.distribution.limits.max_serialized_bytes = 2500
    try {
      const result = admitShortReadDistributions(
        record,
        'CAG',
        shortReadDistributionReceipt(record)!
      )
      expect(result.allele).toEqual(
        expect.objectContaining({
          status: 'UNAVAILABLE',
          reason_code: 'ALLELE_BYTE_LIMIT_EXCEEDED',
        })
      )
      expect(result.allele.distributions).toEqual([])
      expect(result.genotype.status).toBe('AVAILABLE')
      expect(result.genotype.returned_bins).toBe(1)
    } finally {
      artifact.distribution.limits.max_serialized_bytes = originalLimit
    }
  })

  test('returns NONE for a locus without an exact unique main-context key and performs no GET', async () => {
    const result = await resolveLongReadTrShortReadDistributions(
      { id: '1-1-2-A', lr_cohort: 'hgsvc_hprc' },
      {},
      jest.fn()
    )
    expect(result).toEqual(
      expect.objectContaining({ status: 'NONE', reason_code: 'NO_EXACT_MAIN_COMPONENT' })
    )
    expect(fetchDetail).not.toHaveBeenCalled()
  })
})
