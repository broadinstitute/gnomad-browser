import type { TrLocusId } from '../../../dataset-metadata/longReadTrLocusId'
import { getY1AncillaryClickhouseClient } from '../clickhouse'
import { withCache } from '../cache'
import type { Y1AncillaryRoute } from '../y1_config'
import type { LongReadCohort } from './long_read_y1_variants'

export const MAX_LONG_READ_TR_HISTOGRAM_BYTES = 200 * 1024

const NO_CALL_STATUS = 'UNAVAILABLE_NOT_IN_ADMITTED_HISTOGRAM_CONTRACT'
const UNAVAILABLE_SOURCE_INTERACTION = Object.freeze({
  interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES',
  reason:
    'The admitted histogram source contains aggregate count bins only; exact contributor identities are unavailable.',
})
const UNAVAILABLE_PLOT_INTERACTION = Object.freeze({
  interaction_status: 'UNAVAILABLE_PLOTS',
  reason: 'Contributor interaction is unavailable because the repeat-count plots are unavailable.',
})

type SourceRecord = {
  source_variant_id?: unknown
  task_id?: unknown
  attempt_id?: unknown
  an?: unknown
}

type LocusHistogramRequest = {
  reference_genome: string
  lr_cohort: LongReadCohort
  primary_database: string
  source_run_id: string
  components: TrLocusId['components']
  source_records: SourceRecord[]
}

type ExactHistogramIdentity = {
  ancillaryRunId: string
  ancillaryDatabase: string
  cohort: LongReadCohort
  primaryDatabase: string
  primaryRunId: string
  primaryTaskId: string
  primaryAttemptId: string
  sourceVariantId: string
  sourceAn: number
  component: TrLocusId['components'][number]
}

type AlleleBin = { repunit_count: number; frequency: number }
type GenotypeBin = {
  short_allele_repunit_count: number
  long_allele_repunit_count: number
  frequency: number
}

type ParsedStratum<T> = {
  ancestry_group: string
  sex: 'XX' | 'XY' | 'unknown'
  distribution: T[]
}

const unavailable = (status: string, reason_code: string) => ({
  status,
  reason_code,
  identity: null,
  unit: null,
  repeat_unit: null,
  overall: null,
  callability: [],
  allele_size_distribution: [],
  genotype_distribution: [],
  max_repunits: null,
  interaction: UNAVAILABLE_PLOT_INTERACTION,
})

const invariant = (message: string): never => {
  throw new Error(`TR_HISTOGRAM_INVARIANT: ${message}`)
}

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value) invariant(`${label} is missing`)
  return value as string
}

const requiredNonnegativeInteger = (value: unknown, label: string) => {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0) invariant(`${label} is not a nonnegative integer`)
  return number
}

const requiredFiniteNumber = (value: unknown, label: string) => {
  const number = Number(value)
  if (!Number.isFinite(number)) invariant(`${label} is not finite`)
  return number
}

const parseAlleleBins = (value: unknown, label: string, allowEmpty = false): AlleleBin[] => {
  if (typeof value !== 'string') invariant(`${label} is not a string`)
  const histogram = value as string
  if (!histogram.trim()) {
    if (allowEmpty) return []
    invariant(`${label} is empty`)
  }
  const seen = new Set<number>()
  return histogram.split(',').map((rawBin: string) => {
    const match = /^([0-9]+)x:([0-9]+)$/.exec(rawBin.trim())
    if (!match) invariant(`${label} contains a malformed bin`)
    const repunit_count = requiredNonnegativeInteger(match![1], `${label} repeat count`)
    const frequency = requiredNonnegativeInteger(match![2], `${label} frequency`)
    if (seen.has(repunit_count)) invariant(`${label} contains a duplicate bin`)
    seen.add(repunit_count)
    return { repunit_count, frequency }
  })
}

const parseGenotypeBins = (value: unknown, label: string, allowEmpty = false): GenotypeBin[] => {
  if (typeof value !== 'string') invariant(`${label} is not a string`)
  const histogram = value as string
  if (!histogram.trim()) {
    if (allowEmpty) return []
    invariant(`${label} is empty`)
  }
  const seen = new Set<string>()
  return histogram.split(',').map((rawBin: string) => {
    const match = /^([0-9]+)\/([0-9]+):([0-9]+)$/.exec(rawBin.trim())
    if (!match) invariant(`${label} contains a malformed bin`)
    const short_allele_repunit_count = requiredNonnegativeInteger(
      match![1],
      `${label} short repeat count`
    )
    const long_allele_repunit_count = requiredNonnegativeInteger(
      match![2],
      `${label} long repeat count`
    )
    const frequency = requiredNonnegativeInteger(match![3], `${label} frequency`)
    if (short_allele_repunit_count > long_allele_repunit_count) {
      invariant(`${label} contains an unordered genotype`)
    }
    const key = `${short_allele_repunit_count}/${long_allele_repunit_count}`
    if (seen.has(key)) invariant(`${label} contains a duplicate bin`)
    seen.add(key)
    return { short_allele_repunit_count, long_allele_repunit_count, frequency }
  })
}

const parseSex = (sourceSex: string): 'XX' | 'XY' | 'unknown' => {
  if (sourceSex === 'female') return 'XX' as const
  if (sourceSex === 'male') return 'XY' as const
  if (sourceSex === 'unknown') return 'unknown' as const
  return invariant(`unknown histogram sex ${sourceSex}`)
}

const parsePopulations = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invariant('populations is not a map')
  }
  const alleles: ParsedStratum<AlleleBin>[] = []
  const genotypes: ParsedStratum<GenotypeBin>[] = []
  const seen = new Set<string>()
  for (const [key, histogram] of Object.entries(value as Record<string, unknown>)) {
    const match = /^(AlleleSizeHistogram|BiallelicHistogram):([^:]+):([^:]+)$/.exec(key)
    if (!match) invariant(`malformed population histogram key ${key}`)
    const ancestry_group = match![2]
    const sex = parseSex(match![3])
    const stratumKey = `${match![1]}:${ancestry_group}:${sex}`
    if (seen.has(stratumKey)) invariant(`duplicate population histogram ${stratumKey}`)
    seen.add(stratumKey)
    if (match![1] === 'AlleleSizeHistogram') {
      alleles.push({
        ancestry_group,
        sex,
        distribution: parseAlleleBins(histogram, key),
      })
    } else {
      genotypes.push({
        ancestry_group,
        sex,
        distribution: parseGenotypeBins(histogram, key),
      })
    }
  }
  return { alleles, genotypes }
}

const alleleCounts = (bins: AlleleBin[]) =>
  new Map(bins.map((bin) => [String(bin.repunit_count), bin.frequency]))
const genotypeCounts = (bins: GenotypeBin[]) =>
  new Map(
    bins.map((bin) => [
      `${bin.short_allele_repunit_count}/${bin.long_allele_repunit_count}`,
      bin.frequency,
    ])
  )

const combinedCounts = <T>(
  strata: ParsedStratum<T>[],
  counts: (bins: T[]) => Map<string, number>
) => {
  const combined = new Map<string, number>()
  for (const stratum of strata) {
    for (const [key, count] of counts(stratum.distribution)) {
      combined.set(key, (combined.get(key) || 0) + count)
    }
  }
  return combined
}

const requireEqualCounts = (
  expected: Map<string, number>,
  observed: Map<string, number>,
  label: string
) => {
  const keys = new Set([...expected.keys(), ...observed.keys()])
  if ([...keys].some((key) => expected.get(key) !== observed.get(key))) {
    invariant(`${label} strata do not sum to the aggregate histogram`)
  }
}

const totalBins = (bins: { frequency: number }[]) =>
  bins.reduce((total, bin) => total + bin.frequency, 0)

const isAutosome = (chrom: string) => /^(?:[1-9]|1[0-9]|2[0-2])$/.test(chrom)

const validateStatistics = (row: any, aggregateAlleles: AlleleBin[]) => {
  const values = aggregateAlleles.map((bin) => bin.repunit_count)
  const observedMin = Math.min(...values)
  const observedMax = Math.max(...values)
  const min = requiredFiniteNumber(row.min_repeats, 'min_repeats')
  const mode = requiredFiniteNumber(row.mode_repeats, 'mode_repeats')
  const mean = requiredFiniteNumber(row.mean_repeats, 'mean_repeats')
  const stdev = requiredFiniteNumber(row.stdev_repeats, 'stdev_repeats')
  const median = requiredFiniteNumber(row.median_repeats, 'median_repeats')
  const p99 = requiredFiniteNumber(row.p99_repeats, 'p99_repeats')
  const max = requiredFiniteNumber(row.max_repeats, 'max_repeats')
  if (min !== observedMin || max !== observedMax || stdev < 0) {
    invariant('summary statistics conflict with observed allele bins')
  }
  if ([mode, mean, median, p99].some((value) => value < observedMin || value > observedMax)) {
    invariant('summary statistics fall outside observed allele bins')
  }
  const highestFrequency = Math.max(...aggregateAlleles.map((bin) => bin.frequency))
  if (
    !aggregateAlleles.some(
      (bin) => bin.repunit_count === mode && bin.frequency === highestFrequency
    )
  ) {
    invariant('mode_repeats conflicts with observed allele bins')
  }
  return max
}

const requireExactRowIdentity = (row: any, expected: ExactHistogramIdentity) => {
  const identityPairs: [string, unknown, unknown][] = [
    ['ancillary_run_id', row.ancillary_run_id, expected.ancillaryRunId],
    ['primary_database', row.primary_database, expected.primaryDatabase],
    ['primary_run_id', row.primary_run_id, expected.primaryRunId],
    ['primary_task_id', row.primary_task_id, expected.primaryTaskId],
    ['primary_attempt_id', row.primary_attempt_id, expected.primaryAttemptId],
    ['y1_source_variant_id', row.y1_source_variant_id, expected.sourceVariantId],
    ['chrom', row.chrom, `chr${expected.component.chrom}`],
    ['position', Number(row.position), expected.component.start0],
    ['source_end', Number(row.source_end), expected.component.end0],
    ['motif', row.motif, expected.component.motif],
  ]
  const mismatch = identityPairs.find(([, actual, wanted]) => actual !== wanted)
  if (mismatch) invariant(`${mismatch[0]} does not match the caller identity`)
}

const parseExactRow = (row: any, expected: ExactHistogramIdentity) => {
  if (Buffer.byteLength(JSON.stringify(row), 'utf8') > MAX_LONG_READ_TR_HISTOGRAM_BYTES) {
    invariant('raw histogram payload exceeds the 200 KiB cap')
  }
  requireExactRowIdentity(row, expected)
  if (row.mapping_status !== 'available_exact') {
    invariant('canonical row is not marked available_exact')
  }

  const aggregateAlleles = parseAlleleBins(row.allele_size_histogram, 'allele_size_histogram')
  const aggregateGenotypes = parseGenotypeBins(row.biallelic_histogram, 'biallelic_histogram', true)
  const populations = parsePopulations(row.populations)
  if (!populations.alleles.length) invariant('population allele strata are empty')
  requireEqualCounts(
    alleleCounts(aggregateAlleles),
    combinedCounts(populations.alleles, alleleCounts),
    'allele'
  )
  if (aggregateGenotypes.length) {
    if (!populations.genotypes.length) invariant('population genotype strata are empty')
    requireEqualCounts(
      genotypeCounts(aggregateGenotypes),
      combinedCounts(populations.genotypes, genotypeCounts),
      'genotype'
    )
  } else if (populations.genotypes.length) {
    invariant('population genotype strata exist without an aggregate histogram')
  }

  const uniqueAlleleLengths = requiredNonnegativeInteger(
    row.unique_allele_lengths,
    'unique_allele_lengths'
  )
  if (uniqueAlleleLengths !== aggregateAlleles.length) {
    invariant('unique_allele_lengths does not match aggregate distinct bins')
  }
  const numCalledAlleles = requiredNonnegativeInteger(row.num_called_alleles, 'num_called_alleles')
  const calledAlleles = totalBins(aggregateAlleles)
  if (calledAlleles !== numCalledAlleles || calledAlleles !== expected.sourceAn) {
    invariant('called allele count does not match aggregate bins and source AN')
  }
  const calledGenotypes = aggregateGenotypes.length ? totalBins(aggregateGenotypes) : null
  if (
    calledGenotypes != null &&
    isAutosome(expected.component.chrom) &&
    2 * calledGenotypes !== numCalledAlleles
  ) {
    invariant('autosomal genotype count is not half the called allele count')
  }

  const alleleStrata = new Map(
    populations.alleles.map((stratum) => [
      `${stratum.ancestry_group}\u0000${stratum.sex}`,
      totalBins(stratum.distribution),
    ])
  )
  const genotypeStrata = new Map(
    populations.genotypes.map((stratum) => [
      `${stratum.ancestry_group}\u0000${stratum.sex}`,
      totalBins(stratum.distribution),
    ])
  )
  if (
    isAutosome(expected.component.chrom) &&
    [...alleleStrata].some(
      ([key, count]) => genotypeStrata.get(key) == null || genotypeStrata.get(key)! * 2 !== count
    )
  ) {
    invariant('autosomal stratum genotype counts do not match called allele counts')
  }
  const callabilityKeys = new Set([...alleleStrata.keys(), ...genotypeStrata.keys()])
  const callability = [...callabilityKeys].sort().map((key) => {
    const [ancestry_group, sex] = key.split('\u0000')
    return {
      ancestry_group,
      sex,
      called_alleles: alleleStrata.get(key) ?? null,
      called_diploid_genotypes: genotypeStrata.get(key) ?? null,
      no_call_rate: null,
      no_call_rate_status: NO_CALL_STATUS,
    }
  })

  const repeatUnit = expected.component.motif
  const maxRepeats = validateStatistics(row, aggregateAlleles)
  const response = {
    status: 'AVAILABLE_EXACT',
    reason_code: null,
    identity: {
      ancillary_run_id: expected.ancillaryRunId,
      primary_database: expected.primaryDatabase,
      primary_run_id: expected.primaryRunId,
      primary_task_id: expected.primaryTaskId,
      primary_attempt_id: expected.primaryAttemptId,
      source_variant_id: expected.sourceVariantId,
      component: expected.component,
    },
    unit: 'MOTIF_REPEAT_COUNT',
    repeat_unit: repeatUnit,
    overall: {
      called_alleles: numCalledAlleles,
      called_diploid_genotypes: calledGenotypes,
      no_call_rate: null,
      no_call_rate_status: NO_CALL_STATUS,
    },
    callability,
    allele_size_distribution: populations.alleles.map((stratum) => ({
      ...stratum,
      repunit: repeatUnit,
      quality_description: '',
      q_score: 0,
    })),
    genotype_distribution: populations.genotypes.map((stratum) => ({
      ...stratum,
      short_allele_repunit: repeatUnit,
      long_allele_repunit: repeatUnit,
      quality_description: '',
      q_score: 0,
    })),
    max_repunits: maxRepeats,
    // The admitted af_histograms.tsv row is already aggregated. It contains no
    // per-observation exact ALT identity or genotype pair, so do not join these
    // bins to the primary VCF's MC/length/motif fields.
    interaction: UNAVAILABLE_SOURCE_INTERACTION,
  }
  if (Buffer.byteLength(JSON.stringify(response), 'utf8') > MAX_LONG_READ_TR_HISTOGRAM_BYTES) {
    invariant('parsed histogram payload exceeds the 200 KiB cap')
  }
  return response
}

export const longReadTrHistogramCacheKey = (identity: ExactHistogramIdentity) =>
  [
    'lr_tr_histogram:v1',
    identity.cohort,
    identity.ancillaryDatabase,
    identity.ancillaryRunId,
    identity.primaryDatabase,
    identity.primaryRunId,
    identity.primaryTaskId,
    identity.primaryAttemptId,
    identity.sourceVariantId,
    identity.component.chrom,
    identity.component.start0,
    identity.component.end0,
    identity.component.motif,
  ].join(':')

const exactQueryParams = (identity: ExactHistogramIdentity) => ({
  ancillaryRunId: identity.ancillaryRunId,
  cohort: identity.cohort,
  primaryDatabase: identity.primaryDatabase,
  primaryRunId: identity.primaryRunId,
  primaryTaskId: identity.primaryTaskId,
  primaryAttemptId: identity.primaryAttemptId,
  sourceVariantId: identity.sourceVariantId,
  chrom: `chr${identity.component.chrom}`,
  start0: identity.component.start0,
  end0: identity.component.end0,
  motif: identity.component.motif,
})

const exactIdentityPredicates = `
  ancillary_run_id = {ancillaryRunId:String}
  AND release = 'y1'
  AND cohort = {cohort:String}
  AND reference_genome = 'GRCh38'
  AND modality = 'str_histogram'
  AND primary_database = {primaryDatabase:String}
  AND primary_run_id = {primaryRunId:String}
  AND primary_task_id = {primaryTaskId:String}
  AND primary_attempt_id = {primaryAttemptId:String}
  AND y1_source_variant_id = {sourceVariantId:String}
  AND chrom = {chrom:String}
  AND position = {start0:UInt32}
  AND source_end = {end0:UInt32}
  AND motif = {motif:String}
`

const fetchExactHistogramUncached = async (
  identity: ExactHistogramIdentity,
  route: Y1AncillaryRoute
) => {
  const client = getY1AncillaryClickhouseClient(route)
  const query_params = exactQueryParams(identity)
  const settings = { max_execution_time: 2 }
  const mappingResult = await client.query({
    query: `
      SELECT ancillary_run_id, primary_database, primary_run_id,
        primary_task_id, primary_attempt_id, y1_source_variant_id,
        chrom, position, source_end, motif, raw_match_count, mapping_status
      FROM lr_y1_str_histogram_mapping
      WHERE ${exactIdentityPredicates}
      LIMIT 2
    `,
    query_params,
    format: 'JSONEachRow',
    clickhouse_settings: settings,
  })
  const mappingRows = (await mappingResult.json()) as any[]
  if (!mappingRows.length) {
    return unavailable('UNAVAILABLE_NO_EXACT_MAPPING', 'NO_ADMITTED_EXACT_MAPPING')
  }
  if (mappingRows.length !== 1) invariant('exact identity returned multiple mapping rows')
  const mapping = mappingRows[0]
  requireExactRowIdentity(mapping, identity)
  if (mapping.mapping_status !== 'available_exact' || Number(mapping.raw_match_count) !== 1) {
    return unavailable('UNAVAILABLE_NO_EXACT_MAPPING', 'MAPPING_NOT_AVAILABLE_EXACT')
  }

  const result = await client.query({
    query: `
      SELECT ancillary_run_id, primary_database, primary_run_id,
        primary_task_id, primary_attempt_id, y1_source_variant_id,
        chrom, position, source_end, motif,
        allele_size_histogram, biallelic_histogram,
        min_repeats, mode_repeats, mean_repeats, stdev_repeats,
        median_repeats, p99_repeats, max_repeats,
        unique_allele_lengths, num_called_alleles, populations,
        mapping_status
      FROM lr_y1_str_histograms
      WHERE ${exactIdentityPredicates}
        AND mapping_status = 'available_exact'
      LIMIT 2
    `,
    query_params,
    format: 'JSONEachRow',
    clickhouse_settings: settings,
  })
  const rows = (await result.json()) as any[]
  if (!rows.length) return unavailable('UNAVAILABLE_NO_EXACT_MAPPING', 'NO_ADMITTED_EXACT_MAPPING')
  if (rows.length !== 1) invariant('exact identity returned multiple canonical rows')
  return parseExactRow(rows[0], identity)
}

const fetchExactHistogram = withCache(
  fetchExactHistogramUncached,
  (identity: ExactHistogramIdentity) => longReadTrHistogramCacheKey(identity),
  { expiration: 3600 }
)

export const fetchLongReadTrRepeatCountPlots = async (
  locus: LocusHistogramRequest,
  route: Y1AncillaryRoute | null
) => {
  if (!route || route.receipt.source_format !== 'str_completion') {
    return unavailable('UNAVAILABLE_ANCILLARY', 'NO_ADMITTED_STR_HISTOGRAM_ROUTE')
  }
  if (locus.components.length !== 1) {
    return unavailable('UNAVAILABLE_COMPOUND_LOCUS', 'NO_DEFENSIBLE_SINGLE_REPEAT_COUNT')
  }
  if (locus.source_records.length !== 1) {
    return unavailable('UNAVAILABLE_MULTIPLE_SOURCE_RECORDS', 'SOURCE_RECORD_COUNT_NOT_ONE')
  }
  if (locus.reference_genome !== 'GRCh38') invariant('unsupported primary reference genome')
  const sourceRecord = locus.source_records[0]
  const identity: ExactHistogramIdentity = {
    ancillaryRunId: route.run_id,
    ancillaryDatabase: route.database,
    cohort: locus.lr_cohort,
    primaryDatabase: requiredString(locus.primary_database, 'primary_database'),
    primaryRunId: requiredString(locus.source_run_id, 'primary_run_id'),
    primaryTaskId: requiredString(sourceRecord.task_id, 'primary_task_id'),
    primaryAttemptId: requiredString(sourceRecord.attempt_id, 'primary_attempt_id'),
    sourceVariantId: requiredString(sourceRecord.source_variant_id, 'source_variant_id'),
    sourceAn: requiredNonnegativeInteger(sourceRecord.an, 'source AN'),
    component: locus.components[0],
  }
  return fetchExactHistogram(identity, route)
}
