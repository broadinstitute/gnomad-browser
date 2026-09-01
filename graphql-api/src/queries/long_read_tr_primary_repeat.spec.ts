import {
  longReadTrPrimaryRepeatRegistryForTests,
  primaryRepeatRegistryDigest,
  primaryRepeatRegistryState,
  resolveLongReadTrPrimaryRepeat,
} from './long_read_tr_primary_repeat'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const reviewedRegistry = () => clone(longReadTrPrimaryRepeatRegistryForTests)
const entryLocus = (catalogId: string) => {
  const entry = reviewedRegistry().entries.find((item) => item.catalog_id === catalogId)!
  return {
    id: entry.canonical_locus_id,
    reference_genome: 'GRCh38',
    components: entry.ordered_components,
  }
}
const exactContext = (catalogId: string, locus = entryLocus(catalogId)) => {
  const entry = reviewedRegistry().entries.find((item) => item.catalog_id === catalogId)!
  const component = locus.components[entry.component_index]
  return {
    status: 'EXACT_UNIQUE',
    catalog_digest: reviewedRegistry().catalog_digest,
    catalog_record: {
      id: catalogId,
      main_reference_region: {
        reference_genome: 'GRCh38',
        chrom: component.chrom,
        start: component.start0,
        stop: component.end0,
      },
      reference_repeat_unit: component.motif,
    },
    matched_component_index: entry.component_index,
    matched_component: component,
  }
}

describe('reviewed primary-repeat identity', () => {
  test.each([
    ['HTT', 'CAG', 0, 'coding polyglutamine repeat'],
    ['ATXN1', 'TGC', 0, 'exact stored orientation'],
    ['RFC1', 'AAAAG', 0, 'benign reference motif'],
  ])('selects the exact stored main component for %s', (catalogId, motif, index, role) => {
    const locus = entryLocus(catalogId)
    expect(resolveLongReadTrPrimaryRepeat(locus, exactContext(catalogId, locus))).toEqual(
      expect.objectContaining({
        status: 'AVAILABLE',
        reason_code: null,
        motif,
        component_index: index,
        component: locus.components[index],
        selection_basis: 'EXACT_MAIN_CATALOG_COMPONENT',
        biological_role: role,
        catalog_id: catalogId,
        catalog_digest: reviewedRegistry().catalog_digest,
        registry_digest: reviewedRegistry().content_sha256,
      })
    )
  })

  test('admits only the sole exact source component for an anonymous locus', () => {
    const component = { chrom: '2', start0: 10, end0: 16, motif: 'GAA' }
    expect(
      resolveLongReadTrPrimaryRepeat(
        { id: '2-10-16-GAA', reference_genome: 'GRCh38', components: [component] },
        { status: 'NONE' }
      )
    ).toEqual(
      expect.objectContaining({
        status: 'AVAILABLE',
        motif: 'GAA',
        component_index: 0,
        selection_basis: 'LR_SOLE_COMPONENT',
        catalog_digest: null,
        registry_digest: null,
      })
    )
  })

  test('admits a compound override only from a reviewed, digest-valid exact registry tuple', () => {
    const components = [
      { chrom: '8', start0: 100, end0: 112, motif: 'GAA' },
      { chrom: '8', start0: 112, end0: 118, motif: 'GAG' },
    ]
    const locus = { id: '8-100-112-GAA+8-112-118-GAG', reference_genome: 'GRCh38', components }
    const value: any = reviewedRegistry()
    value.entries.push({
      registry_entry_id: 'reviewed-test-override',
      canonical_locus_id: locus.id,
      catalog_id: null,
      ordered_components: components,
      component_index: 1,
      motif: 'GAG',
      selection_basis: 'REVIEWED_PRIMARY_REPEAT_REGISTRY',
      biological_role: 'reviewed test role',
      approval_state: 'REVIEWED',
      approval_receipt: 'test-review-receipt',
    })
    value.content_sha256 = primaryRepeatRegistryDigest(value)

    expect(
      resolveLongReadTrPrimaryRepeat(locus, { status: 'NONE' }, primaryRepeatRegistryState(value))
    ).toEqual(
      expect.objectContaining({
        status: 'AVAILABLE',
        motif: 'GAG',
        component_index: 1,
        selection_basis: 'REVIEWED_PRIMARY_REPEAT_REGISTRY',
        registry_digest: value.content_sha256,
      })
    )
  })

  test.each([
    [
      'shifted main region',
      (locus: any, context: any) => {
        context.catalog_record.main_reference_region.start += 1
      },
      'MAIN_REGION_NOT_EXACT_COMPONENT',
    ],
    [
      'wrong motif orientation',
      (_locus: any, context: any) => {
        context.catalog_record.reference_repeat_unit = 'CAG'
      },
      'STORED_MOTIF_NOT_EXACT_COMPONENT',
    ],
    [
      'stale catalog digest',
      (_locus: any, context: any) => {
        context.catalog_digest = '0'.repeat(64)
      },
      'CATALOG_DIGEST_MISMATCH',
    ],
  ])('fails closed for %s', (_case, mutate, reason) => {
    const locus = entryLocus('ATXN1')
    const context = exactContext('ATXN1', locus)
    mutate(locus, context)
    expect(resolveLongReadTrPrimaryRepeat(locus, context)).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: reason, motif: null })
    )
  })

  test('fails closed when duplicate exact tuples make the main component non-bijective', () => {
    const component = { chrom: '3', start0: 20, end0: 29, motif: 'CAG' }
    const locus = {
      id: 'duplicate-test',
      reference_genome: 'GRCh38',
      components: [component, { ...component }],
    }
    const context = {
      status: 'EXACT_UNIQUE',
      catalog_digest: reviewedRegistry().catalog_digest,
      catalog_record: {
        id: 'DUPLICATE',
        main_reference_region: {
          reference_genome: 'GRCh38',
          chrom: '3',
          start: 20,
          stop: 29,
        },
        reference_repeat_unit: 'CAG',
      },
      matched_component_index: 0,
      matched_component: component,
    }
    expect(resolveLongReadTrPrimaryRepeat(locus, context)).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'NON_BIJECTIVE_COMPONENT' })
    )
  })

  test('fails closed on a stale registry receipt and never accepts the backend candidate state', () => {
    const locus = entryLocus('HTT')
    const stale = reviewedRegistry()
    stale.content_sha256 = '0'.repeat(64)
    expect(
      resolveLongReadTrPrimaryRepeat(
        locus,
        exactContext('HTT', locus),
        primaryRepeatRegistryState(stale)
      )
    ).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'REGISTRY_DIGEST_MISMATCH' })
    )

    const candidate: any = reviewedRegistry()
    candidate.approval_state = 'CANDIDATE_PENDING_SCIENCE'
    candidate.entries = candidate.entries.map((entry: any) => ({
      ...entry,
      approval_state: 'CANDIDATE_PENDING_SCIENCE',
      approval_receipt: null,
    }))
    candidate.content_sha256 = primaryRepeatRegistryDigest(candidate)
    expect(
      resolveLongReadTrPrimaryRepeat(
        locus,
        exactContext('HTT', locus),
        primaryRepeatRegistryState(candidate)
      )
    ).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'REGISTRY_NOT_REVIEWED' })
    )
  })

  test('does not use first motif, longest component, or familiar motif for unreviewed compounds', () => {
    const locus = {
      id: '1-1-100-CAG+1-100-106-TGC',
      reference_genome: 'GRCh38',
      components: [
        { chrom: '1', start0: 1, end0: 100, motif: 'CAG' },
        { chrom: '1', start0: 100, end0: 106, motif: 'TGC' },
      ],
    }
    expect(resolveLongReadTrPrimaryRepeat(locus, { status: 'NONE' })).toEqual(
      expect.objectContaining({
        status: 'UNAVAILABLE',
        reason_code: 'COMPOUND_PRIMARY_REPEAT_UNREVIEWED',
        motif: null,
      })
    )
  })
})
