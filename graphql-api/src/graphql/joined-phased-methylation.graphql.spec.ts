/* eslint-disable import/first */
import { jest } from '@jest/globals'

const mockGetJoinedRoute = jest.fn()
const mockFetchJoined = jest.fn()

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    ELASTICSEARCH_URL: 'http://elasticsearch.test',
    REDIS_HOST: undefined,
    JSON_CACHE_ENABLE_ALL: false,
    JSON_CACHE_LARGE_GENES: false,
  },
}))
jest.mock('../clickhouse', () => ({
  isY1PilotEnabled: true,
  clickhouseClient: { query: jest.fn() },
  y1ClickhouseClient: { query: jest.fn() },
  getY1AncillaryClickhouseClient: () => ({ query: jest.fn() }),
  getSourcePhasedMethylationClickhouseClient: () => ({ query: jest.fn() }),
  joinedPhasedMethylationRoute: null,
  y1PrimaryManifests: null,
}))

jest.mock('./resolvers/joined-phased-methylation', () => {
  const actual = jest.requireActual('./resolvers/joined-phased-methylation') as Record<string, any>
  const { joinedMethylationError } = jest.requireActual(
    './joined-phased-methylation-errors'
  ) as Record<string, any>
  return {
    ...actual,
    getJoinedPhasedMethylationRoute: () => mockGetJoinedRoute(),
    joinedIdentity: () => ({
      source_run_id: 'source-run',
      source_completion_receipt_sha256: 'a'.repeat(64),
      source_manifest_sha256: 'b'.repeat(64),
      browser_vcf_manifest_bundle_sha256: 'c'.repeat(64),
      browser_vcf_manifest_sha256: 'd'.repeat(64),
      browser_vcf_run_id: 'browser-run',
      orientation_receipt_id: 'orientation-receipt',
      orientation_receipt_sha256: 'e'.repeat(64),
      mapping_artifact_sha256: null,
      mapping_scope: 'CHROMOSOME_WIDE',
    }),
    joinedPhasedCapability: async (cohort: string, chrom: string) => {
      if (cohort === 'aou')
        return {
          available: false,
          joinable_to_vcf: false,
          status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
          identity: null,
          source_sample_ids: [],
          max_samples: 25,
          max_records: 250_000,
          reason: 'AoU is summary-only',
        }
      if (cohort !== 'hgsvc_hprc')
        throw joinedMethylationError(
          'BAD_USER_INPUT',
          'Joined methylation requires the hgsvc_hprc cohort'
        )
      return {
        available: true,
        joinable_to_vcf: true,
        status: 'AVAILABLE_CONFIRMED',
        identity: null,
        source_sample_ids: ['HG00097', 'HG00100'],
        max_samples: 25,
        max_records: 250_000,
        reason: `Available for ${chrom}`,
      }
    },
    joinedRegionScope: (chrom: string, start: number, stop: number, sampleIds: string[]) => {
      if (new Set(sampleIds).size !== sampleIds.length)
        throw joinedMethylationError(
          'BAD_USER_INPUT',
          'Joined methylation sample IDs must be unique'
        )
      if (sampleIds.includes('UNKNOWN'))
        throw joinedMethylationError('BAD_USER_INPUT', 'Unknown joined methylation sample UNKNOWN')
      const completed = sampleIds.filter((sampleId) => sampleId !== 'NO_OUTPUT')
      return {
        chrom,
        start,
        stop,
        requested_sample_ids: sampleIds,
        completed_sample_ids: completed,
        unavailable_samples: sampleIds
          .filter((sampleId) => sampleId === 'NO_OUTPUT')
          .map((sample_id) => ({
            sample_id,
            status: 'UNAVAILABLE_NO_ASSAY_SOURCE',
            reason: 'No phased methylation source output exists for this roster sample',
          })),
      }
    },
  }
})

jest.mock('../queries/haplotype-queries', () => ({
  ...(jest.requireActual('../queries/haplotype-queries') as Record<string, any>),
  fetchJoinedPhasedMethylationForRegion: (...args: any[]) => mockFetchJoined(...args),
}))

import path from 'node:path'
import { loadFilesSync } from '@graphql-tools/load-files'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql, parse, validate } from 'graphql'
import queryComplexity, { directiveEstimator, simpleEstimator } from 'graphql-query-complexity'

import { joinedMethylationError } from './joined-phased-methylation-errors'
import { joinedPhasedMethylationSingleFieldRule } from './joined-phased-methylation-validation'
import haplotypeResolvers from './resolvers/haplotypes'

const schema = makeExecutableSchema({
  typeDefs: mergeTypeDefs([
    ...loadFilesSync(path.join(__dirname, './types')),
    'directive @cost(value: Int!, multipliers: [String!]) on FIELD_DEFINITION',
  ]),
  resolvers: mergeResolvers([haplotypeResolvers]),
})

const admittedRoute = {
  source_route: {
    database: 'source-database',
    run_id: 'source-run',
    receipt_path: '/receipt.json',
    receipt: {},
  },
}

const capabilityField = (alias = '', cohortArgument = '') => `
  ${alias ? `${alias}: ` : ''}joined_phased_methylation_capability(
    chrom: "chr22"${cohortArgument}
  ) {
    available
    status
    source_sample_ids
  }
`

const capabilityQuery = (cohortArgument = '') => `
  query { ${capabilityField('', cohortArgument)} }
`

const regionQuery = (sampleIds: string[], cohortArgument = '') => `
  query {
    joined_phased_methylation_region(
      chrom: "chr22"
      start: 100
      stop: 200
      sample_ids: ${JSON.stringify(sampleIds)}
      expected_orientation_receipt_sha256: "${'e'.repeat(64)}"
      ${cohortArgument}
    ) {
      requested_sample_ids
      completed_sample_ids
      unavailable_samples { sample_id status }
      records { source_row_key }
    }
  }
`

const joinedField = (alias = '') => `
  ${alias ? `${alias}: ` : ''}joined_phased_methylation_region(
    chrom: "chr22"
    start: 100
    stop: 200
    sample_ids: ["HG00097"]
    expected_orientation_receipt_sha256: "${'e'.repeat(64)}"
  ) { records { pos1 } }
`

describe('joined phased methylation through the merged GraphQL schema', () => {
  beforeEach(() => {
    mockGetJoinedRoute.mockReset().mockReturnValue(admittedRoute)
    mockFetchJoined.mockReset().mockImplementation(async () => [])
  })

  test('charges joined fields, rejects amplified aliases, and enforces independent alias caps', () => {
    const complexityRule = (maximum: number, complete: (cost: number) => void) =>
      queryComplexity({
        maximumComplexity: maximum,
        estimators: [
          directiveEstimator({ name: 'cost' }),
          simpleEstimator({ defaultComplexity: 0 }),
        ],
        onComplete: complete,
      })
    let oneCost = -1
    expect(
      validate(schema, parse(`query { ${joinedField()} }`), [
        complexityRule(35, (cost) => {
          oneCost = cost
        }),
        joinedPhasedMethylationSingleFieldRule,
      ])
    ).toEqual([])
    expect(oneCost).toBe(25)

    let twoCost = -1
    const twoAliasDocument = parse(`query { ${joinedField('first')} ${joinedField('second')} }`)
    const costErrors = validate(schema, twoAliasDocument, [
      complexityRule(35, (cost) => {
        twoCost = cost
      }),
    ])
    expect(twoCost).toBe(50)
    expect(costErrors[0].message).toContain('maximum complexity of 35')

    const aliasErrors = validate(schema, twoAliasDocument, [
      complexityRule(100, () => undefined),
      joinedPhasedMethylationSingleFieldRule,
    ])
    expect(aliasErrors.map((error) => error.message)).toContain(
      'Only one joined_phased_methylation_region field is allowed per GraphQL document.'
    )

    let capabilityCost = -1
    const oneCapabilityDocument = parse(`query { ${capabilityField()} }`)
    expect(
      validate(schema, oneCapabilityDocument, [
        complexityRule(35, (cost) => {
          capabilityCost = cost
        }),
        joinedPhasedMethylationSingleFieldRule,
      ])
    ).toEqual([])
    expect(capabilityCost).toBe(10)

    const twoCapabilityAliases = parse(
      `query { ${capabilityField('first')} ${capabilityField('second')} }`
    )
    const capabilityAliasErrors = validate(schema, twoCapabilityAliases, [
      complexityRule(100, () => undefined),
      joinedPhasedMethylationSingleFieldRule,
    ])
    expect(capabilityAliasErrors.map((error) => error.message)).toContain(
      'Only one joined_phased_methylation_capability field is allowed per GraphQL document.'
    )
  })

  test('defaults only omitted cohort and handles explicit HGSVC, AoU, and null distinctly', async () => {
    await expect(graphql({ schema, source: capabilityQuery() })).resolves.toMatchObject({
      data: {
        joined_phased_methylation_capability: {
          available: true,
          status: 'AVAILABLE_CONFIRMED',
          source_sample_ids: ['HG00097', 'HG00100'],
        },
      },
    })
    await expect(
      graphql({ schema, source: capabilityQuery(', lr_cohort: hgsvc_hprc') })
    ).resolves.toMatchObject({
      data: { joined_phased_methylation_capability: { available: true } },
    })
    await expect(
      graphql({ schema, source: capabilityQuery(', lr_cohort: aou') })
    ).resolves.toMatchObject({
      data: {
        joined_phased_methylation_capability: {
          available: false,
          status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
          source_sample_ids: [],
        },
      },
    })
    const explicitNull = await graphql({
      schema,
      source: capabilityQuery(', lr_cohort: null'),
    })
    expect(explicitNull.data).toBeUndefined()
    expect(explicitNull.errors?.[0].message).toMatch(/LongReadCohort!.*null/)
  })

  test('applies the same non-null exact-cohort contract to the region field', async () => {
    const hgsvc = await graphql({
      schema,
      source: regionQuery(['HG00097'], 'lr_cohort: hgsvc_hprc'),
      contextValue: {},
    })
    expect(hgsvc.errors).toBeUndefined()
    expect(hgsvc.data?.joined_phased_methylation_region).not.toBeNull()

    mockFetchJoined.mockClear()
    const aou = await graphql({
      schema,
      source: regionQuery(['HG00097'], 'lr_cohort: aou'),
      contextValue: {},
    })
    expect(aou.errors).toBeUndefined()
    expect(aou.data?.joined_phased_methylation_region).toBeNull()
    expect(mockFetchJoined).not.toHaveBeenCalled()

    const explicitNull = await graphql({
      schema,
      source: regionQuery(['HG00097'], 'lr_cohort: null'),
      contextValue: {},
    })
    expect(explicitNull.data).toBeUndefined()
    expect(explicitNull.errors?.[0].message).toMatch(/LongReadCohort!.*null/)
  })

  test('distinguishes an executed empty result from explicitly unavailable samples', async () => {
    const emptyExecuted = await graphql({
      schema,
      source: regionQuery(['HG00097']),
      contextValue: {},
    })
    expect(emptyExecuted.errors).toBeUndefined()
    expect(emptyExecuted.data?.joined_phased_methylation_region).toMatchObject({
      requested_sample_ids: ['HG00097'],
      completed_sample_ids: ['HG00097'],
      unavailable_samples: [],
      records: [],
    })
    expect(mockFetchJoined).toHaveBeenCalledTimes(1)

    mockFetchJoined.mockClear()
    const unavailable = await graphql({
      schema,
      source: regionQuery(['NO_OUTPUT']),
      contextValue: {},
    })
    expect(unavailable.errors).toBeUndefined()
    expect(unavailable.data?.joined_phased_methylation_region).toMatchObject({
      requested_sample_ids: ['NO_OUTPUT'],
      completed_sample_ids: [],
      unavailable_samples: [{ sample_id: 'NO_OUTPUT', status: 'UNAVAILABLE_NO_ASSAY_SOURCE' }],
      records: [],
    })
    expect(mockFetchJoined).not.toHaveBeenCalled()
  })

  test('exposes canonical one-based positions through the executable schema', async () => {
    mockFetchJoined.mockImplementationOnce(async () => [
      {
        source_row_key: 'a'.repeat(64),
        chr: 'chr22',
        pos1: 99,
        pos2: 100,
        sample: 'HG00097',
        methylation: 50,
        coverage: 10,
        source_haplotype: 1,
        vcf_strand: 1,
      },
    ])
    const result = await graphql({
      schema,
      source: regionQuery(['HG00097']).replace(
        'records { source_row_key }',
        'records { source_row_key pos1 pos2 }'
      ),
      contextValue: {},
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.joined_phased_methylation_region).toMatchObject({
      records: [{ source_row_key: 'a'.repeat(64), pos1: 100, pos2: 101 }],
    })
  })

  test.each([
    [['UNKNOWN'], 'BAD_USER_INPUT'],
    [['HG00097', 'HG00097'], 'BAD_USER_INPUT'],
  ])('returns no envelope for invalid sample IDs %#', async (sampleIds, code) => {
    const result = await graphql({
      schema,
      source: regionQuery(sampleIds as string[]),
      contextValue: {},
    })
    expect(result.data?.joined_phased_methylation_region).toBeNull()
    expect(result.errors?.[0].extensions?.code).toBe(code)
  })

  test('returns no envelope for route loss, query failure, and result overflow', async () => {
    mockFetchJoined.mockImplementationOnce(async () => {
      throw joinedMethylationError(
        'JOINED_METHYLATION_CONTRACT_MISMATCH',
        'Joined methylation raw route no longer matches admission'
      )
    })
    const routeLoss = await graphql({
      schema,
      source: regionQuery(['HG00097']),
      contextValue: {},
    })
    expect(routeLoss.data?.joined_phased_methylation_region).toBeNull()
    expect(routeLoss.errors?.[0].extensions?.code).toBe('JOINED_METHYLATION_CONTRACT_MISMATCH')

    mockFetchJoined.mockImplementationOnce(async () => {
      throw new Error('private ClickHouse failure')
    })
    const queryFailure = await graphql({
      schema,
      source: regionQuery(['HG00097']),
      contextValue: {},
    })
    expect(queryFailure.data?.joined_phased_methylation_region).toBeNull()
    expect(queryFailure.errors?.[0].extensions?.code).toBeUndefined()

    mockFetchJoined.mockImplementationOnce(async () => Array.from({ length: 250_001 }))
    const overflow = await graphql({
      schema,
      source: regionQuery(['HG00097']),
      contextValue: {},
    })
    expect(overflow.data?.joined_phased_methylation_region).toBeNull()
    expect(overflow.errors?.[0].extensions?.code).toBe('JOINED_METHYLATION_RESULT_TOO_LARGE')
  })
})
