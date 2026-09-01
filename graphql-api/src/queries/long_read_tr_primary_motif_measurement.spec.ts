import {
  AOU_GENOTYPE_REASON,
  containedPrimaryMotifFailureReason,
  fetchLongReadTrPrimaryMotifMeasurementUncached,
  MAX_PRIMARY_MOTIF_RESPONSE_BINS,
  preflightLongReadPrimaryMotifProduct,
  primaryMotifProductPreflightStatus,
} from './long_read_tr_primary_motif_measurement'

const digest = (character: string) => character.repeat(64)

type FixtureOptions = {
  cohort?: 'hgsvc_hprc' | 'aou'
  catalog?: 'HTT' | 'ATXN1' | 'RFC1'
  an?: number
  altCount?: number
  calledPeople?: number
  noCallPeople?: number
  cellCount?: number
}

const fixture = ({
  cohort = 'hgsvc_hprc',
  catalog = 'HTT',
  an,
  altCount,
  calledPeople,
  noCallPeople,
  cellCount = 1,
}: FixtureOptions = {}) => {
  const hgsvcAn = { HTT: 584, ATXN1: 584, RFC1: 582 } as const
  const hgsvcAltCount = { HTT: 72, ATXN1: 76, RFC1: 200 } as const
  const hgsvcCalledPeople = { HTT: 292, ATXN1: 292, RFC1: 291 } as const
  const resolvedAn = an ?? (cohort === 'aou' ? 2050 : hgsvcAn[catalog])
  const resolvedAltCount =
    altCount ?? (cohort === 'aou' && catalog === 'RFC1' ? 682 : hgsvcAltCount[catalog])
  const resolvedCalledPeople = calledPeople ?? (cohort === 'aou' ? 0 : hgsvcCalledPeople[catalog])
  const resolvedNoCallPeople =
    noCallPeople ?? (cohort === 'hgsvc_hprc' && catalog === 'RFC1' ? 1 : 0)
  const identities = {
    HTT: ['chr4', 'chr4-3074876-TRV-164', 'CAG'],
    ATXN1: ['chr6', 'chr6-16327633-TRV-90', 'TGC'],
    RFC1: ['chr4', 'chr4-39348424-TRV-55', 'AAAAG'],
  } as const
  const [chrom, id, motif] = identities[catalog]
  const sourceRun = `primary-${cohort}-${chrom}`
  const productRun = `primary-motif-${cohort}-${catalog}`
  const registryDigest = digest('a')
  const genotypeAvailable = cohort === 'hgsvc_hprc'
  const alternateCopies = Math.min(20, resolvedAn)
  const referenceCopies = resolvedAn - alternateCopies
  const bins = [
    {
      exact_units: 10,
      allele_copies: referenceCopies,
      reference_copies: referenceCopies,
      alternate_copies: 0,
      stratum_an: resolvedAn,
      stratum_alt_ac: alternateCopies,
      stratum_ref_copies: referenceCopies,
    },
    {
      exact_units: 12,
      allele_copies: alternateCopies,
      reference_copies: 0,
      alternate_copies: alternateCopies,
      stratum_an: resolvedAn,
      stratum_alt_ac: alternateCopies,
      stratum_ref_copies: referenceCopies,
    },
  ]
  const cells = Array.from({ length: cellCount }, (_, index) => ({
    shorter_exact_units: 10 + index,
    longer_exact_units: 12 + index,
    people: index === 0 ? resolvedCalledPeople : 0,
  })).filter((cell) => cell.people > 0)
  const run = {
    product_run_id: productRun,
    state: 'accepted_frozen',
    primary_database: 'gnomad_lr_y1_product_fixture',
    primary_run_id: sourceRun,
    registry_digest: registryDigest,
    registry_approval_state: 'REVIEWED',
    metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
    algorithm_version: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
    algorithm_sha256: digest('b'),
    anchor_rule: 'TRID_ENVELOPE_LEFT_PADDING_BASE_V1',
    max_producer_bins: 65_536,
    max_genotype_pairs_per_stratum: 5000,
    max_genotype_cells_per_stratum: 5000,
    max_serialized_aggregate_bytes: 1024 * 1024,
    bounds_status: 'WITHIN_BOUNDS',
    serialized_bytes: 1000,
    receipt_sha256: digest('c'),
  }
  const locusReceipt = {
    product_run_id: productRun,
    primary_run_id: sourceRun,
    primary_task_id: 'task-1',
    primary_attempt_id: 'attempt-1',
    source_variant_id: id,
    canonical_locus_id: id,
    primary_motif: motif,
    registry_digest: registryDigest,
    registry_approval_state: 'REVIEWED',
    metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
    algorithm_version: run.algorithm_version,
    algorithm_sha256: run.algorithm_sha256,
    anchor_rule: run.anchor_rule,
    alts_checked: resolvedAltCount,
    bin_count: bins.length,
    overall_an: resolvedAn,
    overall_alt_ac: alternateCopies,
    overall_ref_copies: referenceCopies,
    genotype_status: genotypeAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
    genotype_reason_code: genotypeAvailable ? null : AOU_GENOTYPE_REASON,
    called_diploid_people: resolvedCalledPeople,
    partial_diploid_people: 0,
    no_call_people: resolvedNoCallPeople,
    non_diploid_people: 0,
    genotype_observed_an: genotypeAvailable ? resolvedAn : null,
    genotype_pair_count: genotypeAvailable ? cells.length : 0,
    genotype_cell_count: genotypeAvailable ? cells.length : 0,
    bounds_status: 'WITHIN_BOUNDS',
    status: 'AVAILABLE',
    reason_code: null,
    source_record_sha256: digest('d'),
    allele_receipt_sha256: digest('e'),
    genotype_receipt_sha256: genotypeAvailable ? digest('f') : null,
    serialized_bytes: 1000,
  }
  const locus = {
    id,
    chrom: chrom.replace('chr', ''),
    lr_cohort: cohort,
    primary_database: run.primary_database,
    source_run_id: sourceRun,
    source_records: [
      {
        source_variant_id: id,
        task_id: 'task-1',
        attempt_id: 'attempt-1',
        alt_count: resolvedAltCount,
      },
    ],
  }
  const primaryRepeat = {
    status: 'AVAILABLE',
    motif,
    biological_role: catalog === 'RFC1' ? 'benign reference motif' : null,
  }
  const queries: string[] = []
  const queryRows = jest.fn(async (query: string) => {
    queries.push(query)
    if (query.includes('FROM lr_y1_primary_motif_runs')) return [run]
    if (query.includes('FROM lr_y1_primary_motif_loci')) return [locusReceipt]
    if (query.includes('FROM lr_y1_primary_motif_allele_bins')) return bins
    if (query.includes('FROM lr_y1_primary_motif_genotype_pairs')) return cells
    throw new Error(`Unexpected query: ${query}`)
  })
  return {
    locus,
    primaryRepeat,
    run,
    locusReceipt,
    bins,
    cells,
    queryRows,
    queries,
    an: resolvedAn,
    altCount: resolvedAltCount,
  }
}

describe('exact primary-motif product query', () => {
  test.each([
    ['HTT', 584, 292, 0],
    ['ATXN1', 584, 292, 0],
    ['RFC1', 582, 291, 1],
  ] as const)(
    'serves source-complete HGSVC %s anonymous cells (%i AN; %i called + %i no-call)',
    async (catalog, an, calledPeople, noCallPeople) => {
      const source = fixture({ catalog, an, calledPeople, noCallPeople })
      const result = await fetchLongReadTrPrimaryMotifMeasurementUncached(
        source.locus,
        source.primaryRepeat,
        { enabled: true, queryRows: source.queryRows }
      )

      expect(result).toMatchObject({
        status: 'AVAILABLE',
        called_alleles: an,
        alternate_identities_checked: source.altCount,
        genotype: {
          status: 'AVAILABLE',
          called_diploid_people: calledPeople,
          no_call_people: noCallPeople,
        },
      })
      expect(result.genotype.cells.reduce((sum, cell) => sum + cell.people, 0)).toBe(calledPeople)
      expect(source.queries.join('\n')).not.toMatch(/lr_y1_(alleles|carriers)|sample_id|raw_gt/i)
    }
  )

  test('preserves both HTT source totals while making AoU genotype pairing typed unavailable', async () => {
    const hgsvc = fixture({ catalog: 'HTT', cohort: 'hgsvc_hprc', an: 584 })
    const aou = fixture({ catalog: 'HTT', cohort: 'aou', an: 2050 })
    const hgsvcResult = await fetchLongReadTrPrimaryMotifMeasurementUncached(
      hgsvc.locus,
      hgsvc.primaryRepeat,
      { enabled: true, queryRows: hgsvc.queryRows }
    )
    const aouResult = await fetchLongReadTrPrimaryMotifMeasurementUncached(
      aou.locus,
      aou.primaryRepeat,
      { enabled: true, queryRows: aou.queryRows }
    )

    expect([hgsvcResult.called_alleles, aouResult.called_alleles]).toEqual([584, 2050])
    expect(aouResult.genotype).toEqual({
      status: 'UNAVAILABLE',
      reason_code: AOU_GENOTYPE_REASON,
      called_diploid_people: null,
      no_call_people: null,
      cells: [],
    })
    expect(aou.queryRows).toHaveBeenCalledTimes(3)
  })

  test('requires all 682 RFC1 AoU ALT identities before serving aggregate bins', async () => {
    const source = fixture({ catalog: 'RFC1', cohort: 'aou', altCount: 682 })
    const result = await fetchLongReadTrPrimaryMotifMeasurementUncached(
      source.locus,
      source.primaryRepeat,
      { enabled: true, queryRows: source.queryRows }
    )
    expect(result.alternate_identities_checked).toBe(682)

    source.locusReceipt.alts_checked = 681
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(source.locus, source.primaryRepeat, {
        enabled: true,
        queryRows: source.queryRows,
      })
    ).rejects.toThrow('checked ALT identities')
  })

  test('fails closed for stale, incomplete, and oversized products', async () => {
    const stale = fixture()
    stale.run.primary_run_id = 'stale-primary-run'
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(stale.locus, stale.primaryRepeat, {
        enabled: true,
        queryRows: stale.queryRows,
      })
    ).rejects.toThrow('stale or contradictory')

    const incomplete = fixture()
    incomplete.bins[0].allele_copies -= 1
    incomplete.bins[0].reference_copies -= 1
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(incomplete.locus, incomplete.primaryRepeat, {
        enabled: true,
        queryRows: incomplete.queryRows,
      })
    ).rejects.toThrow('do not exactly reconcile')

    const oversized = fixture()
    oversized.queryRows.mockImplementation(async (query: string) => {
      if (query.includes('FROM lr_y1_primary_motif_runs')) return [oversized.run]
      if (query.includes('FROM lr_y1_primary_motif_loci')) return [oversized.locusReceipt]
      if (query.includes('FROM lr_y1_primary_motif_allele_bins')) {
        return Array.from({ length: MAX_PRIMARY_MOTIF_RESPONSE_BINS + 1 }, (_, exact_units) => ({
          exact_units,
          allele_copies: 1,
          reference_copies: exact_units === 0 ? 1 : 0,
          alternate_copies: exact_units === 0 ? 0 : 1,
          stratum_an: MAX_PRIMARY_MOTIF_RESPONSE_BINS + 1,
          stratum_alt_ac: MAX_PRIMARY_MOTIF_RESPONSE_BINS,
          stratum_ref_copies: 1,
        }))
      }
      return oversized.cells
    })
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(oversized.locus, oversized.primaryRepeat, {
        enabled: true,
        queryRows: oversized.queryRows,
      })
    ).rejects.toThrow('exceed the response bound')
  })

  test.each([
    ['stale run identity', 'PRODUCT_IDENTITY_MISMATCH'],
    ['response bound exceeded', 'PRODUCT_BOUND_EXCEEDED'],
    ['bins do not reconcile', 'PRODUCT_INCOMPLETE'],
    ['network unavailable', 'PRODUCT_QUERY_FAILED'],
  ] as const)('classifies contained %s failures without exposing details', (message, reason) => {
    expect(containedPrimaryMotifFailureReason(new Error(message))).toBe(reason)
  })

  test('public gate is fail-closed while candidate science approval remains outstanding', async () => {
    const source = fixture()
    const result = await fetchLongReadTrPrimaryMotifMeasurementUncached(
      source.locus,
      source.primaryRepeat,
      { enabled: false, queryRows: source.queryRows }
    )
    expect(result).toMatchObject({
      status: 'UNAVAILABLE',
      reason_code: 'PUBLIC_PRODUCT_NOT_APPROVED',
    })
    expect(source.queryRows).not.toHaveBeenCalled()
  })

  test('preflight admits only a complete reviewed within-bounds table set', async () => {
    const source = fixture()
    const tables = [
      'lr_y1_primary_motif_runs',
      'lr_y1_primary_motif_loci',
      'lr_y1_primary_motif_allele_bins',
      'lr_y1_primary_motif_genotype_pairs',
    ].map((name) => ({ name }))
    const queryRows = jest
      .fn()
      .mockResolvedValueOnce(tables)
      .mockResolvedValueOnce([
        {
          ...source.run,
          cohort: 'hgsvc_hprc',
          chrom: 'chr4',
        },
      ])
    await expect(
      preflightLongReadPrimaryMotifProduct({ enabled: true, queryRows })
    ).resolves.toBeUndefined()
    expect(primaryMotifProductPreflightStatus()).toBe('AVAILABLE')
  })
})
