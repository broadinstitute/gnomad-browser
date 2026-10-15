import { createHash } from 'crypto'
import {
  formatTrLocusComponent,
  type TrLocusComponent,
} from '../../../dataset-metadata/longReadTrLocusId'
import { getY1AncillaryClickhouseClient } from '../clickhouse'
import { withCache } from '../cache'
import type { Y1AncillaryRoute } from '../y1_config'
import { contextReceipt, runtimeSourceIdentity, strContextDigest } from '../str_context_admission'

const MAX_BYTES = 200 * 1024
const fail = (message: string): never => {
  throw new Error(`TR_HISTOGRAM_INVARIANT: v2 ${message}`)
}
const uint = (value: unknown, label: string): number => {
  if (!((typeof value === 'string' && /^\d+$/.test(value)) || typeof value === 'number'))
    fail(label)
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) fail(label)
  return n
}
const bounded = (value: unknown) => {
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_BYTES) fail('payload exceeds 200 KiB')
}
const missing = (s: string) => s === '' || s === '.'
type Bins = Map<string, number>
type Stratum = { ancestry: string | null; sex: string | null; bins: Bins; suffix: string }
const sexes = new Set(['female', 'male', 'unknown'])
const isAncestry = (value: string) => /^[a-z0-9]+$/.test(value) && !sexes.has(value)
const parseBins = (value: unknown, pair: boolean): Bins => {
  if (typeof value !== 'string') return fail('missing histogram field')
  const bins: Bins = new Map()
  if (missing(value)) return bins
  for (const bin of value.split(',')) {
    const m = (pair ? /^(\d+)\/(\d+):(\d+)$/ : /^(\d+)x:(\d+)$/).exec(bin)
    if (!m) fail('malformed histogram bin')
    const a = uint(m![1], 'size')
    const b = pair ? uint(m![2], 'size') : a
    const count = uint(m![pair ? 3 : 2], 'frequency')
    const key = pair ? `${a}/${b}` : String(a)
    if (!count || a > b || bins.has(key)) fail('zero, unordered or duplicate bin')
    bins.set(key, count)
  }
  return bins
}
const add = (target: Bins, bins: Bins) => {
  for (const [key, n] of bins) {
    const total = (target.get(key) || 0) + n
    if (!Number.isSafeInteger(total)) fail('count overflow')
    target.set(key, total)
  }
  return target
}
const equal = (a: Bins, b: Bins) => a.size === b.size && [...a].every(([k, n]) => b.get(k) === n)
const sum = (bins: Bins) => [...bins.values()].reduce((a, b) => a + b, 0)
const parseDistribution = (fields: Record<string, unknown>, kind: string, pair: boolean) => {
  const aggregate = parseBins(fields[kind], pair)
  if (
    Object.keys(fields).some(
      (name) => name.startsWith(kind) && name !== kind && !name.startsWith(`${kind}__`)
    )
  )
    fail('unsupported histogram field grammar')
  const strata: Stratum[] = []
  for (const [key, value] of Object.entries(fields).filter(([name]) =>
    name.startsWith(`${kind}__`)
  )) {
    const suffix = key.slice(kind.length + 2)
    const parts = suffix.split('_')
    let ancestry: string | null = null
    let sex: string | null = null
    if (parts.length === 2 && isAncestry(parts[0]) && sexes.has(parts[1])) {
      ancestry = parts[0]
      sex = parts[1]
    } else if (parts.length === 1 && isAncestry(parts[0])) {
      ancestry = parts[0]
    } else if (parts.length === 1 && sexes.has(parts[0])) {
      sex = parts[0]
    } else fail('unsupported histogram stratum')
    strata.push({ ancestry, sex, suffix, bins: parseBins(value, pair) })
  }
  const joints = strata.filter((s) => s.ancestry !== null && s.sex !== null)
  const combined = joints.reduce((a, s) => add(a, s.bins), new Map() as Bins)
  if (!equal(aggregate, combined)) fail('joint strata do not sum to aggregate')
  for (const marginal of strata.filter((s) => s.ancestry === null || s.sex === null)) {
    const expected = joints
      .filter(
        (s) =>
          (!marginal.ancestry || marginal.ancestry === s.ancestry) &&
          (!marginal.sex || marginal.sex === s.sex)
      )
      .reduce((a, s) => add(a, s.bins), new Map() as Bins)
    if (!equal(marginal.bins, expected)) fail('marginal differs from joints')
  }
  return { aggregate, strata, joints }
}
const expansion = (pairs: Bins, diagonalCopies: 1 | 2) => {
  const result: Bins = new Map()
  for (const [key, count] of pairs) {
    const [a, b] = key.split('/')
    add(result, new Map([[a, count]]))
    if (a !== b || diagonalCopies === 2) add(result, new Map([[b, count]]))
  }
  return result
}
const lowerBound = (alleles: Bins, pairs: Bins) => {
  for (const [key, n] of expansion(pairs, 1)) {
    if (n > (alleles.get(key) || 0)) fail('pair one/two-copy lower bound exceeds alleles')
  }
}
const sexAlias = (sex: string | null) => {
  if (sex === 'female') return 'XX'
  if (sex === 'male') return 'XY'
  return 'unknown'
}
const alleleArray = (bins: Bins) =>
  [...bins].map(([n, frequency]) => ({ repunit_count: Number(n), frequency }))
const pairArray = (bins: Bins) =>
  [...bins].map(([key, frequency]) => {
    const [short_allele_repunit_count, long_allele_repunit_count] = key.split('/').map(Number)
    return { short_allele_repunit_count, long_allele_repunit_count, frequency }
  })

/** Raw source fields remain authoritative. Marginals are checked, never plotted twice.
 * Pair failure is independent of the allele view; no biological diploidy is inferred.
 */
export const parseSourceContextFields = (fields: Record<string, unknown>) => {
  bounded(fields)
  const alleles = parseDistribution(fields, 'AlleleSizeHistogram', false)
  const called = uint(fields.NumCalledAlleles, 'NumCalledAlleles')
  if (!alleles.joints.length) fail('missing disjoint allele strata')
  if (
    called !== sum(alleles.aggregate) ||
    uint(fields.UniqueAlleleLengths, 'UniqueAlleleLengths') !== alleles.aggregate.size
  )
    fail('allele count mismatch')
  let pairs: ReturnType<typeof parseDistribution> | null = null
  let pairStatus = 'UNAVAILABLE_MISSING'
  let pairEncoding: string | null = null
  try {
    // An absent optional pair aggregate must not hide nonempty pair strata.
    const pairFields = {
      ...fields,
      BiallelicHistogram: fields.BiallelicHistogram === undefined ? '' : fields.BiallelicHistogram,
    }
    const parsed = parseDistribution(pairFields, 'BiallelicHistogram', true)
    lowerBound(alleles.aggregate, parsed.aggregate)
    for (const stratum of parsed.strata) {
      const allele = alleles.strata.find((s) => s.suffix === stratum.suffix)
      if (!allele && stratum.bins.size) fail('pair stratum lacks allele counterpart')
      lowerBound(allele?.bins || new Map(), stratum.bins)
    }
    if (parsed.aggregate.size) {
      pairs = parsed
      pairStatus = 'AVAILABLE_SOURCE_ENCODING'
      const twoCopies =
        equal(alleles.aggregate, expansion(parsed.aggregate, 2)) &&
        alleles.joints.every((s) => {
          const pair = parsed.joints.find((p) => p.suffix === s.suffix)
          return equal(s.bins, expansion(pair?.bins || new Map(), 2))
        })
      pairEncoding = twoCopies ? 'TWO_COPY_CONSISTENT' : 'SOURCE_N_OVER_N_MAY_BE_ONE_VALUE'
    }
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('TR_HISTOGRAM_INVARIANT:'))
      throw error
    pairStatus = 'UNAVAILABLE_INVALID'
  }
  return { alleles, pairs, called, pairStatus, pairEncoding }
}

export type SourceContextIdentity = {
  cohort: string
  ancillaryDatabase: string
  ancillaryRunId: string // Unchanged capture run, NOT projection instance.
  captureDatabase: string
  projectionInstanceId: string
  // Physical runtime tuple only, selected once by runtimeSourceIdentity at the route boundary.
  // Logical original identity remains separately named in receiptIdentity.source.
  source: { uri: string; generation: string; size_bytes: number; md5_base64: string }
  projectionVersion: string
  receiptDigest: string
  receiptIdentity: unknown
  captureTaskId: string
  primaryDatabase: string
  primarySnapshotDigest: string
  primaryRunId: string
  // These caller values fence cached results, not evidence of source-primary binding.
  sourceRecords: unknown[]
  component: TrLocusComponent
}

export const sourceContextCacheKey = (identity: SourceContextIdentity) =>
  `lr_tr_histogram:candidate:v2:${createHash('sha256')
    .update(JSON.stringify(identity))
    .digest('hex')}`

export const unavailableSourceContext = (status: string, reason_code: string) => ({
  status,
  reason_code,
  identity: null,
  source_context: null,
  page_match: null,
  primary_binding: null,
  primary_an_comparison: 'NOT_COMPARABLE',
  allele_status: 'UNAVAILABLE',
  pair_status: 'UNAVAILABLE',
  pair_encoding: null,
  pair_observations: null,
  unit: null,
  repeat_unit: null,
  overall: null,
  callability: [],
  allele_size_distribution: [],
  genotype_distribution: [],
  max_repunits: null,
  interaction: {
    interaction_status: 'UNAVAILABLE_PLOTS',
    reason: 'Source-context plots are unavailable.',
  },
})

export const parseSourceContextRow = (row: any, identity: SourceContextIdentity) => {
  bounded(row)
  const component = identity.component
  const expected: Record<string, unknown> = {
    contract: 'updated_histogram_source_v1',
    cohort: identity.cohort,
    run_id: identity.ancillaryRunId,
    task_id: identity.captureTaskId,
    source_uri: identity.source.uri,
    source_generation: identity.source.generation,
    source_md5_base64: identity.source.md5_base64,
    projection_version: identity.projectionVersion,
    receipt_digest: identity.receiptDigest,
    chrom: component.chrom,
    locus_id: formatTrLocusComponent(component),
    motif: component.motif,
  }
  for (const [key, value] of Object.entries(expected))
    if (row[key] !== value) fail(`source ${key} mismatch`)
  if (
    Number(row.source_size_bytes) !== identity.source.size_bytes ||
    uint(row.locus_start, 'locus_start') !== component.start0 ||
    uint(row.locus_end, 'locus_end') !== component.end0
  )
    fail('source bounds/size mismatch')
  if (!/^[ACGTN]+$/.test(component.motif)) fail('unsupported literal motif')
  const ordinal = String(row.row_ordinal)
  if (!/^[1-9]\d*$/.test(ordinal) || BigInt(ordinal) > BigInt('18446744073709551615'))
    fail('source row ordinal')
  const fields = row.source_fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields))
    fail('source_fields is not a map')
  for (const key of ['LocusId', 'Motif', 'Interval', 'VC'])
    if (typeof fields[key] !== 'string') fail(`missing source ${key}`)
  if (
    fields.LocusId !== row.locus_id ||
    fields.Motif !== row.motif ||
    fields.Interval !== row.source_interval
  )
    fail('raw/source helper mismatch')
  if ((missing(fields.VC) ? null : fields.VC) !== row.source_vc) fail('raw VC/helper mismatch')
  const context = /^([1-9]|1\d|2[0-2]|X|Y):(\d+)-(\d+)$/.exec(fields.Interval)
  if (!context || context[1] !== component.chrom) fail('source interval grammar')
  const start = uint(context![2], 'context start')
  const end = uint(context![3], 'context end')
  if (
    start > component.start0 ||
    end < component.end0 ||
    start >= end ||
    row.context_chrom !== context![1] ||
    Number(row.context_start) !== start ||
    Number(row.context_end) !== end
  )
    fail('source context does not contain named repeat')
  if (!missing(fields.VC)) {
    const vc = /^([1-9]|1\d|2[0-2]|X|Y):(\d+)-(\d+)$/.exec(fields.VC)
    if (!vc || uint(vc[2], 'VC start') >= uint(vc[3], 'VC end')) fail('source VC grammar')
  }
  const parsed = parseSourceContextFields(fields)
  if (
    uint(row.num_called_alleles, 'num_called_alleles') !== parsed.called ||
    uint(row.unique_allele_lengths, 'unique_allele_lengths') !== parsed.alleles.aggregate.size
  )
    fail('count helper mismatch')
  const { alleles, pairs } = parsed
  // The capture is UInt32; these existing chart GraphQL fields are signed Int.
  // Fail within the optional-product boundary rather than during serialization.
  if (
    parsed.called > 0x7fffffff ||
    [...alleles.aggregate.keys()].some((n) => Number(n) > 0x7fffffff)
  )
    fail('source values exceed GraphQL Int range')
  for (const name of [
    'Min',
    'Mode',
    'Mean',
    'Stdev',
    'Median',
    '99thPercentile',
    'Max',
    'ShortAllele99thPercentile',
    'ShortAlleleMax',
    'HemiAllele99thPercentile',
    'HemiAlleleMax',
  ]) {
    const value = fields[name]
    if (
      value !== undefined &&
      (typeof value !== 'string' ||
        (!missing(value) &&
          (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ||
            !Number.isFinite(Number(value)) ||
            Number(value) < 0 ||
            (Number(value) === 0 && /[1-9]/.test(value.split(/[eE]/)[0])) ||
            parsed.called === 0)))
    )
      fail('invalid optional source summary')
  }
  const callerRecord =
    identity.sourceRecords.length === 1 ? (identity.sourceRecords[0] as { an?: unknown }) : null
  const callerAn = callerRecord?.an
  const comparableAn =
    (typeof callerAn === 'number' || (typeof callerAn === 'string' && /^\d+$/.test(callerAn))) &&
    Number.isSafeInteger(Number(callerAn)) &&
    Number(callerAn) >= 0
  let primaryAnComparison = 'NOT_COMPARABLE'
  if (comparableAn) primaryAnComparison = Number(callerAn) === parsed.called ? 'MATCH' : 'MISMATCH'
  const common = {
    called_diploid_genotypes: null,
    no_call_rate: null,
    no_call_rate_status: 'UNAVAILABLE_NOT_IN_ADMITTED_HISTOGRAM_CONTRACT',
  }
  const response = {
    status: 'AVAILABLE_SOURCE_CONTEXT',
    reason_code: null,
    identity: null,
    source_context: {
      // This URI identifies the unchanged physical capture, never the logical original.
      source_uri: row.source_uri,
      source_generation: row.source_generation,
      source_md5_base64: row.source_md5_base64,
      source_row_ordinal: ordinal,
      source_locus_id: row.locus_id,
      interval_raw: fields.Interval,
      vc_raw: fields.VC,
      context_relation: start === component.start0 && end === component.end0 ? 'EQUAL' : 'CONTAINS',
      measurement_kind: 'SOURCE_REPORTED_SIZE',
      unit: 'SOURCE_REPORTED_UNIT',
      semantics_evidence_status: 'PRODUCER_VERSION_UNKNOWN',
      projection_version: identity.projectionVersion,
      receipt_digest: identity.receiptDigest,
    },
    page_match: {
      canonical_locus_id: formatTrLocusComponent(component),
      component_index: 0,
      component,
      status: 'EXACT_NAMED_COMPONENT',
    },
    primary_binding: { status: 'NOT_ESTABLISHED', an_concordance: 'NOT_ESTABLISHED' },
    // Numeric comparison only: even MATCH is not evidence of record identity.
    primary_an_comparison: primaryAnComparison,
    allele_status: parsed.called ? 'AVAILABLE' : 'UNAVAILABLE_NO_OBSERVATIONS',
    pair_status: parsed.pairStatus,
    pair_encoding: parsed.pairEncoding,
    pair_observations: pairs ? sum(pairs.aggregate) : null,
    unit: 'SOURCE_REPORTED_UNIT',
    repeat_unit: component.motif,
    overall: { called_alleles: parsed.called, ...common },
    callability: alleles.joints.map((s) => ({
      ancestry_group: s.ancestry!,
      sex: sexAlias(s.sex),
      called_alleles: sum(s.bins),
      ...common,
    })),
    allele_size_distribution: alleles.joints.map((s) => ({
      ancestry_group: s.ancestry!,
      sex: sexAlias(s.sex),
      distribution: alleleArray(s.bins),
      repunit: component.motif,
      quality_description: '',
      q_score: 0,
    })),
    genotype_distribution: (pairs?.joints || []).map((s) => ({
      ancestry_group: s.ancestry!,
      sex: sexAlias(s.sex),
      distribution: pairArray(s.bins),
      short_allele_repunit: component.motif,
      long_allele_repunit: component.motif,
      quality_description: '',
      q_score: 0,
    })),
    max_repunits: alleles.aggregate.size
      ? Math.max(...[...alleles.aggregate.keys()].map(Number))
      : null,
    interaction: {
      interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES',
      reason:
        'Aggregate source measurements have no exact contributor identities; pairs are unphased source encodings and equal encoded values may represent one or two observations.',
    },
  }
  bounded(response)
  return response
}

const fetchSourceContextUncached = async (
  identity: SourceContextIdentity,
  route: Y1AncillaryRoute
) => {
  const client = getY1AncillaryClickhouseClient(route)
  const query_params = {
    cohort: identity.cohort,
    ancillaryRunId: identity.ancillaryRunId,
    projectionVersion: identity.projectionVersion,
    receiptDigest: identity.receiptDigest,
    primaryDatabase: identity.primaryDatabase,
    primarySnapshotDigest: identity.primarySnapshotDigest,
    canonicalLocusId: formatTrLocusComponent(identity.component),
    componentIndex: 0,
    chrom: identity.component.chrom,
    namedStart: identity.component.start0,
    namedEnd: identity.component.end0,
    motif: identity.component.motif,
    sourceUri: identity.source.uri,
    sourceGeneration: identity.source.generation,
  }
  const result = await client.query({
    query: `SELECT * FROM lr_y1_str_context_mapping_v2
      WHERE cohort = {cohort:String} AND ancillary_run_id = {ancillaryRunId:String}
        AND projection_version = {projectionVersion:String} AND receipt_digest = {receiptDigest:String}
        AND primary_database = {primaryDatabase:String} AND primary_snapshot_digest = {primarySnapshotDigest:String}
        AND canonical_locus_id = {canonicalLocusId:String} AND component_index = {componentIndex:UInt32}
        AND chrom = {chrom:String} AND named_start = {namedStart:UInt32} AND named_end = {namedEnd:UInt32} AND motif = {motif:String}
      LIMIT 2`,
    query_params,
    format: 'JSONEachRow',
    clickhouse_settings: { max_execution_time: 2 },
  })
  const mappings = (await result.json()) as any[]
  if (!mappings.length)
    return unavailableSourceContext('UNAVAILABLE_NO_SOURCE_CONTEXT', 'NO_ADMITTED_CONTEXT_MAPPING')
  if (mappings.length !== 1)
    return unavailableSourceContext('UNAVAILABLE_AMBIGUOUS_CONTEXT', 'MULTIPLE_CONTEXT_MAPPINGS')
  const mapping = mappings[0]
  bounded(mapping)
  const mappingExpected = {
    cohort: identity.cohort,
    ancillary_run_id: identity.ancillaryRunId,
    projection_version: identity.projectionVersion,
    receipt_digest: identity.receiptDigest,
    primary_database: identity.primaryDatabase,
    primary_snapshot_digest: identity.primarySnapshotDigest,
    canonical_locus_id: query_params.canonicalLocusId,
    chrom: query_params.chrom,
    motif: query_params.motif,
    primary_binding_status: 'NOT_ESTABLISHED',
    primary_an_concordance: 'NOT_ESTABLISHED',
  }
  for (const [key, value] of Object.entries(mappingExpected))
    if (mapping[key] !== value) fail(`mapping ${key} mismatch`)
  if (
    uint(mapping.component_index, 'component index') !== 0 ||
    uint(mapping.named_start, 'named start') !== identity.component.start0 ||
    uint(mapping.named_end, 'named end') !== identity.component.end0
  )
    fail('mapping component mismatch')
  const count = uint(mapping.context_count, 'context_count')
  if (mapping.mapping_status === 'unavailable_ambiguous' && count > 1)
    return unavailableSourceContext('UNAVAILABLE_AMBIGUOUS_CONTEXT', 'MULTIPLE_SOURCE_CONTEXTS')
  if (mapping.mapping_status === 'unavailable_no_context' && count === 0)
    return unavailableSourceContext('UNAVAILABLE_NO_SOURCE_CONTEXT', 'NO_SOURCE_CONTEXT')
  if (mapping.mapping_status !== 'available_source_context' || count !== 1)
    fail('mapping status/count mismatch')
  if (
    mapping.source_uri !== identity.source.uri ||
    mapping.source_generation !== identity.source.generation ||
    !/^[1-9]\d*$/.test(String(mapping.source_row_ordinal))
  )
    fail('mapping source identity mismatch')
  const histogram = await client.query({
    query: `SELECT * FROM lr_y1_str_context_histograms_v2
      WHERE cohort = {cohort:String} AND run_id = {ancillaryRunId:String}
        AND projection_version = {projectionVersion:String} AND receipt_digest = {receiptDigest:String}
        AND source_uri = {sourceUri:String} AND source_generation = {sourceGeneration:String}
        AND row_ordinal = {sourceRowOrdinal:UInt64}
      LIMIT 2`,
    query_params: { ...query_params, sourceRowOrdinal: String(mapping.source_row_ordinal) },
    format: 'JSONEachRow',
    clickhouse_settings: { max_execution_time: 2 },
  })
  const rows = (await histogram.json()) as any[]
  if (rows.length !== 1) fail('mapping does not reference exactly one source row')
  if (String(rows[0].row_ordinal) !== String(mapping.source_row_ordinal))
    fail('mapping ordinal mismatch')
  return parseSourceContextRow(rows[0], identity)
}
const fetchSourceContextCached = withCache(fetchSourceContextUncached, sourceContextCacheKey, {
  expiration: 3600,
})

// Validate before cache lookup as well as before queries: the DB belongs to the
// projection, while both table run predicates and mapping pointers retain capture identity.
export const fetchSourceContextHistogram = (
  identity: SourceContextIdentity,
  route: Y1AncillaryRoute
) => {
  const r = contextReceipt(route)
  if (
    identity.ancillaryDatabase !== r.database ||
    identity.ancillaryRunId !== r.capture.run_id ||
    identity.captureDatabase !== r.capture.database ||
    identity.projectionInstanceId !== r.projection.instance_id ||
    identity.cohort !== r.cohort ||
    identity.projectionVersion !== r.projection.version ||
    identity.receiptDigest !== r.receipt_digest ||
    identity.captureTaskId !== r.capture.task_id ||
    identity.primaryDatabase !== r.primary_snapshot.database ||
    identity.primarySnapshotDigest !== r.primary_snapshot.bundle_digest ||
    strContextDigest(identity.source) !== strContextDigest(runtimeSourceIdentity(r.source))
  )
    fail('query capture/projection scope mismatch')
  return fetchSourceContextCached(identity, route)
}
