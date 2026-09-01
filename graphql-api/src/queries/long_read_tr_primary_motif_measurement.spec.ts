import { createHash } from 'node:crypto'

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
  const component = { start0: 100, end0: 100 + motif.length * 10, motif }
  const componentDigest = createHash('sha256')
    .update('Y1_PRIMARY_MOTIF_COMPONENTS_V1\0')
    .update(JSON.stringify([component]))
    .digest('hex')
  const catalogDigest = digest('9')
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
  const genotypeStratumReceipt = digest('7')
  const cells = Array.from({ length: cellCount }, (_, index) => ({
    shorter_exact_units: 10 + index,
    longer_exact_units: 12 + index,
    people: index === 0 ? resolvedCalledPeople : 0,
    receipt_count: 1,
    pair_receipt_sha256: genotypeStratumReceipt,
  })).filter((cell) => cell.people > 0)
  const margins = genotypeAvailable
    ? Array.from({ length: resolvedAltCount + 1 }, (_, alleleIndex) => {
        let expectedCopies = 0
        if (alleleIndex === 0) expectedCopies = referenceCopies
        else if (alleleIndex <= alternateCopies) expectedCopies = 1
        return {
          allele_index: alleleIndex,
          expected_copies: expectedCopies,
          paired_copies: expectedCopies,
          excluded_from_pairs_copies: 0,
          margin_receipt_sha256: genotypeStratumReceipt,
        }
      })
    : []
  const run = {
    product_run_id: productRun,
    state: 'accepted_frozen',
    primary_database: 'gnomad_lr_y1_product_fixture',
    primary_run_id: sourceRun,
    registry_digest: registryDigest,
    registry_approval_state: 'REVIEWED',
    metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
    algorithm_version: 'Y1_PRIMARY_MOTIF_PRODUCER_V1',
    algorithm_sha256: digest('b'),
    anchor_rule: 'TRID_ENVELOPE_LEFT_PADDING_BASE_V1',
    max_producer_bins: 65_536,
    max_genotype_pairs_per_stratum: 5000,
    max_genotype_cells_per_stratum: 5000,
    max_serialized_aggregate_bytes: 1024 * 1024,
    bounds_status: 'complete_no_truncation',
    serialized_bytes: 1000,
    genotype_margin_rows: margins.length,
    genotype_margin_content_sha256: genotypeAvailable ? digest('8') : null,
    receipt_sha256: digest('c'),
  }
  const locusReceipt = {
    product_run_id: productRun,
    primary_run_id: sourceRun,
    primary_task_id: 'task-1',
    primary_attempt_id: 'attempt-1',
    source_variant_id: id,
    canonical_locus_id: id,
    component_starts0: [component.start0],
    component_ends0: [component.end0],
    component_motifs: [component.motif],
    component_digest: componentDigest,
    primary_component_index: 0,
    primary_motif: motif,
    selection_basis: 'EXACT_MAIN_CATALOG_COMPONENT',
    biological_role: catalog === 'RFC1' ? 'benign reference motif' : null,
    catalog_id: catalog,
    catalog_digest: catalogDigest,
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
    genotype_margin_count: margins.length,
    bounds_status: 'complete_no_truncation',
    status: 'complete',
    reason_code: genotypeAvailable ? null : AOU_GENOTYPE_REASON,
    source_record_sha256: digest('d'),
    allele_receipt_sha256: digest('e'),
    genotype_receipt_sha256: digest('f'),
    serialized_bytes: 1000,
  }
  const locus = {
    id,
    chrom: chrom.replace('chr', ''),
    lr_cohort: cohort,
    primary_database: run.primary_database,
    source_run_id: sourceRun,
    components: [{ chrom, ...component }],
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
    component_index: 0,
    component: { chrom, ...component },
    selection_basis: 'EXACT_MAIN_CATALOG_COMPONENT',
    biological_role: catalog === 'RFC1' ? 'benign reference motif' : null,
    catalog_id: catalog,
    catalog_digest: catalogDigest,
    registry_digest: null,
  }
  const queries: string[] = []
  const queryRows = jest.fn(async (query: string) => {
    queries.push(query)
    if (query.includes('FROM lr_y1_primary_motif_runs')) return [run]
    if (query.includes('FROM lr_y1_primary_motif_loci')) return [locusReceipt]
    if (query.includes('FROM lr_y1_primary_motif_allele_bins')) return bins
    if (query.includes('FROM lr_y1_primary_motif_genotype_pairs')) return cells
    if (query.includes('FROM lr_y1_primary_motif_genotype_margins') && query.includes('count()')) {
      return [{ margin_count: margins.length }]
    }
    if (query.includes('FROM lr_y1_primary_motif_genotype_margins')) return margins
    throw new Error(`Unexpected query: ${query}`)
  })
  return {
    locus,
    primaryRepeat,
    run,
    locusReceipt,
    bins,
    cells,
    margins,
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

  test('rejects repeated-equal-motif component substitution before product lookup', async () => {
    const source = fixture()
    source.locus.components.push({
      ...source.locus.components[0],
      start0: source.locus.components[0].end0 + 10,
      end0: source.locus.components[0].end0 + 40,
    })
    source.primaryRepeat.component = source.locus.components[1]

    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(source.locus, source.primaryRepeat, {
        enabled: true,
        queryRows: source.queryRows,
      })
    ).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      reason_code: 'PRODUCT_IDENTITY_MISMATCH',
    })
    expect(source.queryRows).not.toHaveBeenCalled()
  })

  test.each([
    ['selection_basis', 'LR_SOLE_COMPONENT'],
    ['catalog_digest', digest('6')],
    ['algorithm_sha256', digest('5')],
    ['anchor_rule', 'STALE_ANCHOR_RULE'],
  ])('rejects stale locus %s identity before reading bins', async (field, value) => {
    const source = fixture()
    ;(source.locusReceipt as any)[field] = value
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(source.locus, source.primaryRepeat, {
        enabled: true,
        queryRows: source.queryRows,
      })
    ).rejects.toThrow('stale or cross-bound')
    expect(source.queries.some((query) => query.includes('allele_bins'))).toBe(false)
  })

  test('requires complete REF and every specific-ALT margin before genotype availability', async () => {
    const source = fixture()
    source.margins[1].expected_copies += 1
    source.margins[1].paired_copies += 1
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(source.locus, source.primaryRepeat, {
        enabled: true,
        queryRows: source.queryRows,
      })
    ).rejects.toThrow('complete REF/specific-ALT margins')
  })

  test('requires genotype pair and margin rows to share the cryptographic stratum receipt', async () => {
    const source = fixture()
    for (let index = 0; index < source.margins.length; index += 1) {
      source.margins[index].margin_receipt_sha256 = digest('4')
    }
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(source.locus, source.primaryRepeat, {
        enabled: true,
        queryRows: source.queryRows,
      })
    ).rejects.toThrow('complete REF/specific-ALT margins')
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
      'lr_y1_primary_motif_genotype_margins',
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
    ).resolves.toEqual({ status: 'AVAILABLE', reason_code: null })
    expect(primaryMotifProductPreflightStatus()).toBe('AVAILABLE')
  })

  test('requires the fifth genotype-margin table in optional-product inventory', async () => {
    const source = fixture()
    const fourTables = [
      'lr_y1_primary_motif_runs',
      'lr_y1_primary_motif_loci',
      'lr_y1_primary_motif_allele_bins',
      'lr_y1_primary_motif_genotype_pairs',
    ].map((name) => ({ name }))
    const result = await preflightLongReadPrimaryMotifProduct({
      enabled: true,
      queryRows: jest.fn().mockResolvedValueOnce(fourTables).mockResolvedValueOnce([source.run]),
    })
    expect(result).toEqual({
      status: 'UNAVAILABLE',
      reason_code: 'OPTIONAL_PRODUCT_PREFLIGHT_FAILED',
    })
  })

  test('contains optional-product preflight failure as typed unavailable', async () => {
    const result = await preflightLongReadPrimaryMotifProduct({
      enabled: true,
      queryRows: jest.fn().mockRejectedValue(new Error('optional ClickHouse product absent')),
    })
    expect(result).toEqual({
      status: 'UNAVAILABLE',
      reason_code: 'OPTIONAL_PRODUCT_PREFLIGHT_FAILED',
    })
    expect(primaryMotifProductPreflightStatus()).toBe('UNAVAILABLE')

    const source = fixture()
    await expect(
      fetchLongReadTrPrimaryMotifMeasurementUncached(source.locus, source.primaryRepeat, {
        enabled: true,
      })
    ).resolves.toMatchObject({ status: 'UNAVAILABLE', reason_code: 'PRODUCT_INCOMPLETE' })
  })
})
