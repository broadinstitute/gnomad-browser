import { parseTrLocusId } from './longReadTrLocusId'
import {
  isCompleteExactContext,
  isCompleteExactTableContext,
  LongReadTrTableCatalogContext,
  LongReadTrTableCatalogScope,
} from './longReadTrCatalogContext'

// Exact stored/reference examples from the frozen crosswalk; not a science approval receipt.
const fixtures = [
  { id: 'ATXN1', canonicalId: '6-16327633-16327723-TGC', pathogenic: ['TGC'] },
  {
    id: 'HTT',
    canonicalId:
      '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG',
    pathogenic: ['CAG'],
  },
  {
    id: 'RFC1',
    canonicalId: '4-39348424-39348479-AAAAG',
    pathogenic: ['AAGGC', 'AAGGG', 'AGAGG', 'AGGGC', 'GGACA'],
  },
]

const makeContext = (fixture = fixtures[2]) => {
  const locus = parseTrLocusId(fixture.canonicalId)!
  const component = locus.components[0]
  const scope: LongReadTrTableCatalogScope = {
    locus,
    lrCohort: 'hgsvc_hprc',
    lrRunId: 'accepted-run',
    lrRelease: 'y1',
  }
  const context: LongReadTrTableCatalogContext = {
    status: 'EXACT_UNIQUE',
    reason_code: null,
    catalog_dataset: 'gnomad_r4',
    catalog_source: 'frozen-reference',
    catalog_digest: 'a'.repeat(64),
    catalog_record: {
      id: fixture.id,
      reference_repeat_unit: component.motif,
      main_reference_region: {
        reference_genome: 'GRCh38',
        chrom: component.chrom,
        start: component.start0,
        stop: component.end0,
      },
      repeat_units: [
        ...(fixture.id === 'RFC1'
          ? [
              { repeat_unit: 'A', classification: 'reference' },
              { repeat_unit: 'AAAAG', classification: 'benign' },
            ]
          : []),
        ...fixture.pathogenic.map((repeat_unit) => ({ repeat_unit, classification: 'pathogenic' })),
      ],
    },
    matched_component_index: 0,
    matched_component: { ...component },
    matched_reference_region_index: 0,
    lr_database: 'accepted-db',
    lr_release: 'y1',
    lr_run_id: 'accepted-run',
    lr_cohort: 'hgsvc_hprc',
  }
  return { scope, context }
}

describe('exact catalog admission for a table row', () => {
  test.each(fixtures)('admits the exact $id context for its own row', (fixture) => {
    const { context, scope } = makeContext(fixture)
    const original = JSON.stringify(context)
    expect(isCompleteExactTableContext(context, scope)).toBe(true)
    expect(JSON.stringify(context)).toBe(original)
  })

  test('admits a context whose catalog lists no repeat units', () => {
    const { context, scope } = makeContext()
    context.catalog_record!.repeat_units = []
    expect(isCompleteExactTableContext(context, scope)).toBe(true)
  })
})

describe('fail-closed catalog admission', () => {
  test.each([
    'NONE',
    'MULTIPLE',
    'AMBIGUOUS',
    'AMBIGUOUS_CATALOG',
    'AMBIGUOUS_COMPONENT',
    'CATALOG_UNAVAILABLE',
    'UNAVAILABLE',
    'DIAGNOSTIC',
  ])('rejects status %s despite otherwise positive fields', (status) => {
    const { context, scope } = makeContext()
    context.status = status
    expect(isCompleteExactContext(context, scope.lrCohort)).toBe(false)
    expect(isCompleteExactTableContext(context, scope)).toBe(false)
  })

  test.each([null, undefined])('rejects missing context %s', (context) => {
    const { scope } = makeContext()
    expect(isCompleteExactTableContext(context, scope)).toBe(false)
  })

  const invalid: [string, (context: LongReadTrTableCatalogContext) => void][] = [
    [
      'missing record',
      (c) => {
        c.catalog_record = null
      },
    ],
    [
      'missing dataset',
      (c) => {
        c.catalog_dataset = ''
      },
    ],
    [
      'missing source',
      (c) => {
        c.catalog_source = ''
      },
    ],
    [
      'missing digest',
      (c) => {
        c.catalog_digest = ''
      },
    ],
    [
      'malformed digest',
      (c) => {
        c.catalog_digest = 'not-a-digest'
      },
    ],
    [
      'wrong dataset',
      (c) => {
        c.catalog_dataset = 'gnomad_r3'
      },
    ],
    [
      'wrong assembly',
      (c) => {
        c.catalog_record!.main_reference_region.reference_genome = 'GRCh37'
      },
    ],
    [
      'missing record id',
      (c) => {
        c.catalog_record!.id = ''
      },
    ],
    [
      'missing reference motif',
      (c) => {
        c.catalog_record!.reference_repeat_unit = ''
      },
    ],
    [
      'wrong reference motif',
      (c) => {
        c.catalog_record!.reference_repeat_unit = 'AAGGC'
      },
    ],
    [
      'missing component',
      (c) => {
        c.matched_component = null
      },
    ],
    [
      'wrong component motif',
      (c) => {
        c.matched_component!.motif = 'AAGAA'
      },
    ],
    [
      'wrong component chrom',
      (c) => {
        c.matched_component!.chrom = '5'
      },
    ],
    [
      'wrong component start',
      (c) => {
        c.matched_component!.start0 += 1
      },
    ],
    [
      'wrong component end',
      (c) => {
        c.matched_component!.end0 += 1
      },
    ],
    [
      'null index',
      (c) => {
        c.matched_component_index = null
      },
    ],
    [
      'negative index',
      (c) => {
        c.matched_component_index = -1
      },
    ],
    [
      'fractional index',
      (c) => {
        c.matched_component_index = 0.5
      },
    ],
    [
      'out of bounds index',
      (c) => {
        c.matched_component_index = 1
      },
    ],
    [
      'missing region index',
      (c) => {
        c.matched_reference_region_index = null
      },
    ],
    [
      'negative region index',
      (c) => {
        c.matched_reference_region_index = -1
      },
    ],
    [
      'fractional region index',
      (c) => {
        c.matched_reference_region_index = 0.5
      },
    ],
    [
      'missing database',
      (c) => {
        c.lr_database = null
      },
    ],
    [
      'missing release',
      (c) => {
        c.lr_release = null
      },
    ],
    [
      'wrong release',
      (c) => {
        c.lr_release = 'stale-release'
      },
    ],
    [
      'missing run',
      (c) => {
        c.lr_run_id = null
      },
    ],
    [
      'stale run',
      (c) => {
        c.lr_run_id = 'stale-run'
      },
    ],
    [
      'wrong cohort',
      (c) => {
        c.lr_cohort = 'aou'
      },
    ],
    [
      'missing cohort',
      (c) => {
        c.lr_cohort = null
      },
    ],
    [
      'diagnostic reason',
      (c) => {
        c.reason_code = 'COORDINATE_MISMATCH'
      },
    ],
    [
      'digest mismatch outcome',
      (c) => {
        c.status = 'CATALOG_UNAVAILABLE'
        c.reason_code = 'CATALOG_DETAIL_DIGEST_MISMATCH'
      },
    ],
    [
      'DAB1 mismatch',
      (c) => {
        c.status = 'NONE'
        c.reason_code = 'COORDINATE_MISMATCH'
      },
    ],
    [
      'FMR1 source absent',
      (c) => {
        c.status = 'UNAVAILABLE'
        c.reason_code = 'SOURCE_UNAVAILABLE'
      },
    ],
  ]
  test.each(invalid)('rejects %s', (_, invalidate) => {
    const { context, scope } = makeContext()
    invalidate(context)
    expect(isCompleteExactTableContext(context, scope)).toBe(false)
  })

  test('requires caller provenance instead of borrowing it from the context', () => {
    const { context, scope } = makeContext()
    expect(isCompleteExactTableContext(context, { ...scope, lrRunId: '' })).toBe(false)
    expect(isCompleteExactTableContext(context, { ...scope, lrRelease: '' })).toBe(false)
  })

  test('validates the indexed tuple, not membership anywhere in the locus', () => {
    const { context, scope } = makeContext(fixtures[1])
    context.matched_component_index = 1
    expect(isCompleteExactTableContext(context, scope)).toBe(false)
  })

  test('accepts each cohort only in its own scope', () => {
    const { context, scope } = makeContext()
    context.lr_cohort = 'aou'
    expect(isCompleteExactTableContext(context, scope)).toBe(false)
    expect(isCompleteExactTableContext(context, { ...scope, lrCohort: 'aou' })).toBe(true)
  })
})
