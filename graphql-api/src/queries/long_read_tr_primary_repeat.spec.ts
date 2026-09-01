import {
  PrimaryRepeatRegistry,
  primaryRepeatRegistryDigest,
  primaryRepeatRegistryState,
  resolveLongReadTrPrimaryRepeat,
} from './long_read_tr_primary_repeat'

const catalogDigest = '638cb10c4d834af1fced0f73af28f4bd7d7ef018ce50aa218b612ca24bb03a43'
const fixtures = {
  HTT: {
    id: '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG',
    components: [
      { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
      { chrom: '4', start0: 3074927, end0: 3074936, motif: 'CAA' },
      { chrom: '4', start0: 3074939, end0: 3074966, motif: 'CCG' },
      { chrom: '4', start0: 3074966, end0: 3074972, motif: 'CCT' },
      { chrom: '4', start0: 3074983, end0: 3074994, motif: 'GCC' },
      { chrom: '4', start0: 3075029, end0: 3075040, motif: 'CCG' },
    ],
    classifications: ['pathogenic'],
  },
  ATXN1: {
    id: '6-16327633-16327723-TGC',
    components: [{ chrom: '6', start0: 16327633, end0: 16327723, motif: 'TGC' }],
    classifications: ['pathogenic'],
  },
  RFC1: {
    id: '4-39348424-39348479-AAAAG',
    components: [{ chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' }],
    classifications: ['benign'],
  },
}

const entryLocus = (catalogId: keyof typeof fixtures) => ({
  id: fixtures[catalogId].id,
  reference_genome: 'GRCh38',
  components: fixtures[catalogId].components,
})
const exactContext = (catalogId: keyof typeof fixtures, locus = entryLocus(catalogId)) => {
  const component = locus.components[0]
  return {
    status: 'EXACT_UNIQUE',
    catalog_digest: catalogDigest,
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
    matched_component_index: 0,
    matched_component: component,
    matched_reference_repeat_unit_classifications: fixtures[catalogId].classifications,
  }
}

const compoundLocus = () => {
  const components = [
    { chrom: '8', start0: 100, end0: 112, motif: 'GAA' },
    { chrom: '8', start0: 112, end0: 118, motif: 'GAG' },
  ]
  return { id: '8-100-112-GAA+8-112-118-GAG', reference_genome: 'GRCh38', components }
}

const registryFor = (
  locus: ReturnType<typeof compoundLocus>,
  approvalState: string
): PrimaryRepeatRegistry => {
  const value: PrimaryRepeatRegistry = {
    schema_version: 1,
    contract: 'GNOMAD_LR_PRIMARY_REPEAT_IDENTITY_V1',
    reference_genome: 'GRCh38',
    approval_state: approvalState,
    entries: [
      {
        registry_entry_id: 'future-test-override',
        canonical_locus_id: locus.id,
        catalog_id: null,
        ordered_components: locus.components,
        component_index: 1,
        motif: 'GAG',
        selection_basis: 'REVIEWED_PRIMARY_REPEAT_REGISTRY',
        biological_role: null,
        approval_state: approvalState,
      },
    ],
    content_sha256: '',
  }
  value.content_sha256 = primaryRepeatRegistryDigest(value)
  return value
}

describe('primary-repeat identity', () => {
  test.each([
    ['HTT', 'CAG', null],
    ['ATXN1', 'TGC', null],
    ['RFC1', 'AAAAG', 'benign reference motif'],
  ] as const)(
    'authorizes %s from the exact short-read catalog identity only',
    (catalogId, motif, role) => {
      const locus = entryLocus(catalogId)
      expect(resolveLongReadTrPrimaryRepeat(locus, exactContext(catalogId, locus))).toEqual(
        expect.objectContaining({
          status: 'AVAILABLE',
          reason_code: null,
          motif,
          component_index: 0,
          component: locus.components[0],
          selection_basis: 'EXACT_MAIN_CATALOG_COMPONENT',
          biological_role: role,
          catalog_id: catalogId,
          catalog_digest: catalogDigest,
          registry_digest: null,
        })
      )
    }
  )

  test('derives the RFC1 benign role only from exact catalog classification data', () => {
    const locus = entryLocus('RFC1')
    const context = exactContext('RFC1', locus)
    context.matched_reference_repeat_unit_classifications = []
    expect(resolveLongReadTrPrimaryRepeat(locus, context).biological_role).toBeNull()
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

  test('a missing current registry cannot authorize compound identity', () => {
    expect(resolveLongReadTrPrimaryRepeat(compoundLocus(), { status: 'NONE' })).toEqual(
      expect.objectContaining({
        status: 'UNAVAILABLE',
        reason_code: 'COMPOUND_PRIMARY_REPEAT_UNREVIEWED',
        motif: null,
      })
    )
  })

  test('an unreviewed future registry cannot authorize compound identity', () => {
    const locus = compoundLocus()
    const candidate = registryFor(locus, 'CANDIDATE_PENDING_SCIENCE')
    expect(
      resolveLongReadTrPrimaryRepeat(
        locus,
        { status: 'NONE' },
        primaryRepeatRegistryState(candidate)
      )
    ).toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', reason_code: 'REGISTRY_NOT_REVIEWED' })
    )
  })

  test('keeps a digest-valid reviewed registry as a future, explicitly injected basis', () => {
    const locus = compoundLocus()
    const future = registryFor(locus, 'REVIEWED')
    expect(
      resolveLongReadTrPrimaryRepeat(locus, { status: 'NONE' }, primaryRepeatRegistryState(future))
    ).toEqual(
      expect.objectContaining({
        status: 'AVAILABLE',
        motif: 'GAG',
        component_index: 1,
        selection_basis: 'REVIEWED_PRIMARY_REPEAT_REGISTRY',
        registry_digest: future.content_sha256,
      })
    )
  })

  test.each([
    [
      'shifted main region',
      (context: any) => {
        context.catalog_record.main_reference_region.start += 1
      },
      'MAIN_REGION_NOT_EXACT_COMPONENT',
    ],
    [
      'wrong motif orientation',
      (context: any) => {
        context.catalog_record.reference_repeat_unit = 'CAG'
      },
      'STORED_MOTIF_NOT_EXACT_COMPONENT',
    ],
    [
      'invalid catalog digest',
      (context: any) => {
        context.catalog_digest = 'not-a-digest'
      },
      'CATALOG_DIGEST_MISMATCH',
    ],
  ])('fails closed for %s', (_case, mutate, reason) => {
    const locus = entryLocus('ATXN1')
    const context = exactContext('ATXN1', locus)
    mutate(context)
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
      ...exactContext('HTT'),
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
})
