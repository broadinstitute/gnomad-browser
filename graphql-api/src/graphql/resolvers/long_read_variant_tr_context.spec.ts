/* eslint-disable import/first */
jest.mock('../../queries/short-tandem-repeat-queries', () => ({
  fetchBoundedShortTandemRepeatCatalog: jest.fn(),
  fetchShortTandemRepeatById: jest.fn(),
}))
jest.mock('../../queries/long_read_y1_provenance', () => ({
  getY1SourceSnapshot: jest.fn(),
}))
jest.mock('../../queries/long_read_variants', () => ({
  fetchVariantById: jest.fn(),
  fetchVariantsByGene: jest.fn(),
  fetchVariantsByRegion: jest.fn(),
}))

import fs from 'fs'
import path from 'path'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { buildSchema, graphql, GraphQLObjectType } from 'graphql'
import { parseTrLocusId } from '../../../../dataset-metadata/longReadTrLocusId'
import { getTrTableCatalogPresentation } from '../../../../dataset-metadata/longReadTrCatalogContext'
import * as authority from '../../queries/long_read_tr_reference'
import { getY1SourceSnapshot } from '../../queries/long_read_y1_provenance'
import {
  fetchBoundedShortTandemRepeatCatalog,
  fetchShortTandemRepeatById,
} from '../../queries/short-tandem-repeat-queries'
import { resolveVariantTrShortReadContext } from './long_read_variant_tr_context'
import resolvers from './long_read_variants'

const artifact = authority.longReadTrReferenceArtifactForTests
const catalog = artifact.rows.map((row: any) => row.short)
const fetchAll = fetchBoundedShortTandemRepeatCatalog as jest.Mock
const fetchDetail = fetchShortTandemRepeatById as jest.Mock
const getSource = getY1SourceSnapshot as jest.Mock
const catalogRow = (id: string): any => artifact.rows.find((row: any) => row.short.id === id)
const sourceFor = (cohort: 'hgsvc_hprc' | 'aou', chrom: string) => {
  const row: any = artifact.rows.find(
    (item: any) => item.short.main_reference_region.chrom === chrom.replace(/^chr/, '')
  )
  const receipt = row.cohorts[cohort]
  return {
    database: receipt.source_database,
    release: receipt.source_release,
    run_id: receipt.source_run_id,
    reference_genome: 'GRCh38',
    cohort,
    chrom: `chr${chrom.replace(/^chr/, '')}`,
    load_scope: 'full_chromosome',
    state: 'accepted_tasks',
    metadata_run_id: null,
    carriers_available: cohort === 'hgsvc_hprc',
    accepted_task_attempts: [{ task_id: 't1', attempt_id: 'a1' }],
    accepted_task_attempt_digest: 'a'.repeat(64),
    primary_manifest_sha256: null,
  }
}
const variantFor = (id = 'RFC1', cohort: 'hgsvc_hprc' | 'aou' = 'hgsvc_hprc') => {
  const receipt = catalogRow(id).cohorts[cohort]
  const locus = parseTrLocusId(receipt.candidates[0].canonical_id)!
  return {
    variant_id: `${id}-source-alt-1`,
    allele_type: 'trv',
    tr_locus_id: locus.canonicalId,
    chrom: locus.components[0].chrom,
    reference_genome: 'GRCh38',
    data_source: 'Y1_ACCEPTED',
    lr_cohort: cohort,
    source_release: receipt.source_release as string,
    source_run_id: receipt.source_run_id as string,
  }
}
const scopeFor = (row: ReturnType<typeof variantFor>) => ({
  locus: parseTrLocusId(row.tr_locus_id)!,
  lrCohort: row.lr_cohort,
  lrRunId: row.source_run_id,
  lrRelease: row.source_release,
})
const request = () => ({ esClient: {} })

beforeEach(() => {
  jest.restoreAllMocks()
  fetchAll.mockReset().mockResolvedValue(catalog)
  fetchDetail.mockReset().mockImplementation(async (_client, _dataset, id) => catalogRow(id).short)
  getSource.mockReset().mockImplementation(async (cohort, chrom) => sourceFor(cohort, chrom))
})

describe('optional variant-row exact TR context (real crosswalk, local mocked sources)', () => {
  test('executes the dedicated gene projection against the real SDL with independent row provenance', async () => {
    // Load SDL only, never the application's dependency-initializing schema module.
    const schema = makeExecutableSchema({
      typeDefs: mergeTypeDefs([
        ...loadFilesSync(path.join(__dirname, '../types')),
        'directive @cost(value: Int!, multipliers: [String!]) on FIELD_DEFINITION',
      ]),
      resolvers: { LongReadVariant: resolvers.LongReadVariant },
    })
    expect(
      (schema.getType('LongReadVariant') as GraphQLObjectType)
        .getFields()
        .tr_locus_short_read_context.type.toString()
    ).toBe('LongReadTrShortReadContext')
    const source = fs
      .readFileSync(
        path.join(__dirname, '../../../../browser/src/GenePage/LongReadVariantsInGene.tsx'),
        'utf8'
      )
      .match(/const query = `([\s\S]*?)`/)![1]
    const row = { ...variantFor(), pos: 39348425, ref: 'A', alt: 'AAAAG' }
    const result = await graphql({
      schema,
      source,
      contextValue: request(),
      variableValues: {
        datasetId: 'gnomad_r4_lr',
        lrCohort: row.lr_cohort,
        chrom: row.chrom,
        start: row.pos,
        stop: row.pos + 100,
        referenceGenome: 'GRCh38',
      },
      rootValue: {
        meta: { clinvar_release_date: '2026-01-01' },
        long_read_y1_provenance: { enabled: true, scope_label: 'fixture', sources: [] },
        region: { long_read_variants: [row] },
      },
    })
    expect(result.errors).toBeUndefined()
    const projected = (result.data?.region as any).long_read_variants[0]
    expect(projected).toMatchObject({
      data_source: 'Y1_ACCEPTED',
      reference_genome: 'GRCh38',
      source_run_id: row.source_run_id,
      source_release: row.source_release,
      lr_cohort: row.lr_cohort,
      tr_locus_short_read_context: { status: 'EXACT_UNIQUE', catalog_record: { id: 'RFC1' } },
    })
    expect(
      getTrTableCatalogPresentation(projected.tr_locus_short_read_context, scopeFor(row))
    ).not.toBeNull()
    const context = projected.tr_locus_short_read_context
    expect(Object.keys(context)).toEqual([
      'status',
      'reason_code',
      'catalog_dataset',
      'catalog_source',
      'catalog_digest',
      'catalog_record',
      'matched_component_index',
      'matched_component',
      'matched_reference_region_index',
      'lr_database',
      'lr_release',
      'lr_run_id',
      'lr_cohort',
    ])
    expect(Object.keys(context.catalog_record)).toEqual([
      'id',
      'reference_repeat_unit',
      'main_reference_region',
      'repeat_units',
    ])
    expect(Object.keys(context.catalog_record.main_reference_region)).toEqual([
      'reference_genome',
      'chrom',
      'start',
      'stop',
    ])
    expect(Object.keys(context.catalog_record.repeat_units[0])).toEqual([
      'repeat_unit',
      'classification',
    ])
    expect(Object.keys(context.matched_component)).toEqual(['chrom', 'start0', 'end0', 'motif'])
    expect(JSON.stringify(projected.tr_locus_short_read_context)).not.toMatch(
      /associated_diseases|candidates|primary_repeat/
    )
  })

  test.each(['ATXN1', 'HTT', 'RFC1'])(
    'reuses exact %s authority and the shared projection',
    async (id) => {
      const row = variantFor(id)
      const join = jest.spyOn(authority, 'resolveLongReadTrShortReadContext')
      const result = await resolvers.LongReadVariant.tr_locus_short_read_context(row, {}, request())
      expect(result).toMatchObject({
        status: 'EXACT_UNIQUE',
        reason_code: null,
        catalog_record: { id },
        lr_cohort: row.lr_cohort,
        lr_run_id: row.source_run_id,
        lr_release: row.source_release,
      })
      expect(join).toHaveBeenCalledTimes(1)
      expect(join.mock.calls[0][0]).toEqual({
        id: row.tr_locus_id,
        components: parseTrLocusId(row.tr_locus_id)!.components,
        chrom: row.chrom,
        reference_genome: 'GRCh38',
        lr_cohort: row.lr_cohort,
      })
      expect(fetchAll).toHaveBeenCalledTimes(1)
      expect(fetchDetail).toHaveBeenCalledTimes(1)
      const presentation = getTrTableCatalogPresentation(result, scopeFor(row))!
      expect(presentation).not.toBeNull()
      if (id === 'RFC1') {
        expect(scopeFor(row).locus.components.map((component) => component.motif)).toEqual([
          'AAAAG',
        ])
        expect(presentation.pathogenicMotifs).toEqual(['AAGGC', 'AAGGG', 'AGAGG', 'AGGGC', 'GGACA'])
        expect(presentation.pathogenicLine?.label).toBe('Catalog pathogenic: AAGGC +4 more motifs')
      }
    }
  )

  test.each([
    { allele_type: 'snv' },
    { allele_type: null },
    { data_source: 'LEGACY' },
    { data_source: null },
    { reference_genome: 'GRCh37' },
    { reference_genome: null },
    { lr_cohort: 'unknown' },
    { lr_cohort: null },
    { source_release: null },
    { source_release: 'y2' },
    { source_run_id: null },
    { source_run_id: '' },
    { tr_locus_id: 'bad-id' },
    { tr_locus_id: null },
    { chrom: '22' },
    { chrom: null },
  ])('rejects ineligible row %j before any optional lookup', async (override) => {
    expect(
      await resolveVariantTrShortReadContext({ ...variantFor(), ...override }, request())
    ).toBeNull()
    expect(getSource).not.toHaveBeenCalled()
    expect(fetchAll).not.toHaveBeenCalled()
    expect(fetchDetail).not.toHaveBeenCalled()
  })

  test.each([
    { run_id: 'other-run' },
    { release: 'y2' },
    { reference_genome: 'GRCh37' },
    { cohort: 'aou' },
    { chrom: 'chr22' },
    { load_scope: 'interval' },
    { state: 'loading' },
    { database: '' },
  ])('does not let a row borrow mismatched source authority %j', async (override) => {
    const row = variantFor()
    getSource.mockResolvedValue({ ...sourceFor(row.lr_cohort, row.chrom), ...override })
    expect(await resolveVariantTrShortReadContext(row, request())).toBeNull()
    expect(fetchAll).not.toHaveBeenCalled()
    expect(fetchDetail).not.toHaveBeenCalled()
  })

  test('also accepts an exact frozen source snapshot without changing the authority', async () => {
    const row = variantFor()
    getSource.mockResolvedValue({
      ...sourceFor(row.lr_cohort, row.chrom),
      state: 'accepted_frozen',
    })
    expect(await resolveVariantTrShortReadContext(row, request())).not.toBeNull()
  })

  test('shares one promise/join/detail for many source ALTs at one canonical locus', async () => {
    const ctx = request()
    const row = variantFor('HTT')
    const join = jest.spyOn(authority, 'resolveLongReadTrShortReadContext')
    const promises = Array.from({ length: 100 }, (_, index) =>
      resolveVariantTrShortReadContext({ ...row, variant_id: `ALT-${index}` } as typeof row, ctx)
    )
    expect(promises.every((promise) => promise === promises[0])).toBe(true)
    const results = await Promise.all(promises)
    expect(results.every((result) => result === results[0] && result !== null)).toBe(true)
    expect(getSource).toHaveBeenCalledTimes(1)
    expect(join).toHaveBeenCalledTimes(1)
    expect(fetchDetail).toHaveBeenCalledTimes(1)
  })

  test('isolates cohort and run keys, including a stale row arriving first', async () => {
    const ctx = request()
    const hgsvc = variantFor()
    const aou = variantFor('RFC1', 'aou')
    const stale = resolveVariantTrShortReadContext({ ...hgsvc, source_run_id: 'old-run' }, ctx)
    const good = resolveVariantTrShortReadContext(hgsvc, ctx)
    const other = resolveVariantTrShortReadContext(aou, ctx)
    expect(stale).not.toBe(good)
    const results = await Promise.all([stale, good, other])
    expect(results[0]).toBeNull()
    expect(results[1]?.lr_cohort).toBe('hgsvc_hprc')
    expect(results[2]?.lr_cohort).toBe('aou')
    expect(getSource).toHaveBeenCalledTimes(2)
    expect(fetchDetail).toHaveBeenCalledTimes(2)
  })

  test('does not carry a join/source across requests sharing the same ES client', async () => {
    const esClient = {}
    const row = variantFor()
    expect(await resolveVariantTrShortReadContext(row, { esClient })).not.toBeNull()
    getSource.mockResolvedValue({ ...sourceFor(row.lr_cohort, row.chrom), run_id: 'new-run' })
    expect(await resolveVariantTrShortReadContext(row, { esClient })).toBeNull()
    expect(getSource).toHaveBeenCalledTimes(2)
    expect(fetchDetail).toHaveBeenCalledTimes(1)
    expect(fetchAll).toHaveBeenCalledTimes(1) // Existing catalog-state cache is preserved.
  })

  test('caps detail concurrency at four and drains the queue even after a failure', async () => {
    let active = 0
    let maximum = 0
    fetchDetail.mockImplementation(async (_client, _dataset, id) => {
      active += 1
      maximum = Math.max(maximum, active)
      await new Promise((resolve) => setImmediate(resolve))
      active -= 1
      if (id === 'ATXN1') throw new Error('optional detail failure')
      return catalogRow(id).short
    })
    const ids = artifact.rows
      .filter((row: any) => row.cohorts.hgsvc_hprc.status === 'EXACT_UNIQUE')
      .slice(0, 16)
      .map((row: any) => row.short.id)
    expect(ids).toContain('ATXN1')
    const ctx = request()
    const results = await Promise.all(
      ids.map((id) => resolveVariantTrShortReadContext(variantFor(id), ctx))
    )
    expect(maximum).toBe(4)
    expect(active).toBe(0)
    expect(fetchDetail).toHaveBeenCalledTimes(ids.length)
    expect(results.filter(Boolean)).toHaveLength(ids.length - 1)
    expect(getSource.mock.calls.length).toBeLessThan(ids.length)
  })

  test.each([
    'source absent',
    'source error',
    'catalog absent',
    'catalog digest',
    'detail absent',
    'detail digest',
    'unexpected join error',
  ])('contains %s without failing ordinary GraphQL rows', async (failure) => {
    if (failure === 'source absent') getSource.mockResolvedValue(null)
    if (failure === 'source error') getSource.mockRejectedValue(new Error('source failure'))
    if (failure === 'catalog absent') fetchAll.mockRejectedValue(new Error('catalog failure'))
    if (failure === 'catalog digest') fetchAll.mockResolvedValue(catalog.slice(1))
    if (failure === 'detail absent') fetchDetail.mockResolvedValue(null)
    if (failure === 'detail digest')
      fetchDetail.mockResolvedValue({ ...catalogRow('RFC1').short, reference_repeat_unit: 'AAGGG' })
    if (failure === 'unexpected join error')
      jest
        .spyOn(authority, 'resolveLongReadTrShortReadContext')
        .mockRejectedValue(new Error('unexpected'))
    const row = variantFor()
    // Exercise nullable field execution, not merely the adapter's promise.
    const schema = buildSchema(
      'type Query { rows: [Row!]! } type Row { variant_id: String! context: Context } type Context { status: String! }'
    )
    const result = await graphql({
      schema,
      source: '{ rows { variant_id context { status } } }',
      contextValue: request(),
      rootValue: {
        rows: [
          {
            ...row,
            context: (_args: unknown, ctx: { esClient: object }) =>
              resolvers.LongReadVariant.tr_locus_short_read_context(row, {}, ctx),
          },
        ],
      },
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.rows).toEqual([{ variant_id: row.variant_id, context: null }])
  })

  test.each(['DAB1', 'FMR1'])(
    'never converts diagnostic/source-absent %s membership into context',
    async (id) => {
      const row = variantFor()
      const candidate = catalogRow(id).cohorts.hgsvc_hprc.candidates[0]
      const chrom = catalogRow(id).short.main_reference_region.chrom
      const source = sourceFor('hgsvc_hprc', chrom)
      const trId = candidate?.canonical_id || `${chrom}-1-10-CGG`
      expect(
        await resolveVariantTrShortReadContext(
          { ...row, chrom, tr_locus_id: trId, source_run_id: source.run_id },
          request()
        )
      ).toBeNull()
      expect(fetchDetail).not.toHaveBeenCalled()
    }
  )

  test.each([
    { status: 'AMBIGUOUS' },
    { status: 'NONE' },
    { reason_code: 'DIAGNOSTIC' },
    { lr_run_id: 'other-run' },
    { lr_release: 'other-release' },
    { lr_cohort: 'aou' },
    { lr_database: 'other-database' },
    { matched_component_index: 99 },
    { matched_component_index: -1 },
    { matched_reference_region_index: null },
    { matched_component: { chrom: '4', start0: 1, end0: 10, motif: 'AAGGG' } },
    { catalog_record: null },
    { catalog_digest: 'bad-digest' },
  ])('rechecks exact returned context against row and snapshot %j', async (override) => {
    const row = variantFor()
    const valid = await resolveVariantTrShortReadContext(row, request())
    jest
      .spyOn(authority, 'resolveLongReadTrShortReadContext')
      .mockResolvedValue({ ...valid, ...override })
    expect(await resolveVariantTrShortReadContext(row, request())).toBeNull()
  })
})
