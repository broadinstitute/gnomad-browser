import { createHash } from 'crypto'

const POPULATION_NAMES: Record<string, string> = {
  afr: 'African/African-American',
  ami: 'Amish',
  amr: 'Admixed American',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  eur: 'European',
  fin: 'Finnish',
  mid: 'Middle Eastern',
  nfe: 'Non-Finnish European',
  oth: 'Other',
  remaining: 'Remaining individuals',
  sas: 'South Asian',
  uniform: 'Uniform',
  sas_non_consang: 'South Asian (F < 0.05)',
  consanguineous: 'South Asian (F > 0.05)',
  exac: 'ExAC',
  bgr: 'Bulgarian (Eastern European)',
  est: 'Estonian',
  gbr: 'British',
  nwe: 'North-Western European',
  seu: 'Southern European',
  swe: 'Swedish',
  kor: 'Korean',
  sgp: 'Singaporean',
  jpn: 'Japanese',
  oea: 'Other East Asian',
  oeu: 'Other European',
  onf: 'Other Non-Finnish European',
  unk: 'Unknown',
}

// "VANumber" because "Number" is taken
type VANumber = { type: string; value: number }

type SequenceInterval = {
  type: string
  start: VANumber
  end: VANumber
}

type SequenceLocation = {
  _id: string | null
  type: string
  sequence_id: string
  interval: SequenceInterval
}

type UnhashedSequenceLocation = Omit<SequenceLocation, '_id'>

type LiteralSequenceExpression = {
  type: string
  sequence: string
}

export type Allele = {
  _id: string | null
  type: string
  location: SequenceLocation
  state: LiteralSequenceExpression
}

type CohortCharacteristic = {
  name: string
  value: string
}

type Cohort = {
  id: string
  label: string | null
  characteristics: CohortCharacteristic[] | null
}

type CohortAlleleFrequencyDerivation = {
  id: string | null
  type: string | null
  label: string | null
  version: string | null
}

type GrpMaxFAF95 = {
  frequency: number
  confidenceInterval: number
  groupId: string
}

type AncillaryResults = {
  grpMaxFAF95: GrpMaxFAF95 | null
  jointGrpMaxFAF95: GrpMaxFAF95 | null
  homozygotes: number | null
  hemizygotes: number | null
}

type QualityMeasures = {
  meanDepth: number | null
  fractionCoverage20x: number | null
  qcFilters: string[] | null
  monoallelic: boolean | null
  lowComplexityRegion: boolean | null
  lowConfidenceLossOfFunctionError: boolean | null
  lossOfFunctionWarning: boolean | null
  heterozygousSkewedAlleleCount: number | null
}

export type CohortAlleleFrequency = {
  id: string
  type: string
  label: string | null
  derivedFrom: CohortAlleleFrequencyDerivation | null
  focusAllele: Allele
  focusAlleleCount: number
  locusAlleleCount: number
  alleleFrequency: number
  cohort: Cohort
  ancillaryResults: AncillaryResults | null
  qualityMeasures: QualityMeasures | null
  subcohortFrequency: CohortAlleleFrequency[]
}

type CohortAlleleFrequencyWithoutSubcohorts = Omit<CohortAlleleFrequency, 'subcohortFrequency'>

const hashWithSha512t24u = (s: string): string => {
  const sha = createHash('sha512').update(s).digest()
  const truncatedSha = Buffer.copyBytesFrom(sha, 0, 24)
  return truncatedSha.toString('base64url')
}

type JSONAble = string | number | Record<string, any>

const normalizedStringify = (input: JSONAble): string => {
  if (typeof input === 'string' || typeof input === 'number') {
    return JSON.stringify(input)
  }

  const keysToSerialize = Object.keys(input)
    .filter((key) => !key.startsWith('_'))
    .sort()

  const serializedPairs = keysToSerialize.map((key) => {
    return `"${key}":${normalizedStringify(input[key])}`
  })
  return `{${serializedPairs.join(',')}}`
}

const generateLocationId = (location: UnhashedSequenceLocation) => {
  const normalizedJSON = normalizedStringify(location)
  const hash = hashWithSha512t24u(normalizedJSON)
  return `ga4gh:VSL.${hash}`
}

const generateSequenceId = (sequence: string) => {
  return hashWithSha512t24u(sequence)
}

const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)

export const resolveVAAllele = async (obj: any, _args: any, _ctx: any): Promise<Allele | null> => {
  const vrsData = obj.vrs

  if (!vrsData) {
    return null
  }

  const { ref, alt } = vrsData

  const altVRSId = alt.allele_id as string
  const refSequence = ref.state as string
  const altSequence = alt.state as string
  const altState: LiteralSequenceExpression = {
    type: 'LiteralSequenceExpression',
    sequence: altSequence,
  }
  const sequenceId = generateSequenceId(refSequence)
  const interval: SequenceInterval = {
    type: 'SequenceInterval',
    start: { type: 'Number', value: alt.start },
    end: { type: 'Number', value: alt.end },
  }
  const unhashedLocation: UnhashedSequenceLocation = {
    type: 'SequenceLocation',
    sequence_id: sequenceId,
    interval,
  }
  const location: SequenceLocation = {
    ...unhashedLocation,
    _id: generateLocationId(unhashedLocation),
  }

  return { _id: altVRSId, type: 'Allele', location, state: altState }
}

type Subset = {
  id?: string
  ac: number
  an: number
  hemizygote_count: number
  homozygote_count: number
  grpMax?: GrpMaxFAF95
  jointGrpMax?: GrpMaxFAF95
  qualityMeasures: QualityMeasures
}

const GNOMAD_V4_DERIVATION = {
  id: 'gnomad4.1.0',
  type: 'DataSet',
  label: 'gnomAD v4.1.0',
  version: '4.1.0',
}

const getAncestryAndSexIds = (subsetId: string): [string | undefined, string | undefined] => {
  const [first, second] = subsetId.split('_')
  return first === 'XX' || first === 'XY' ? [undefined, first] : [first, second]
}

const cohortDescription = (
  subsetId: string | undefined,
  frequencyField: 'exome' | 'genome'
): string => {
  if (subsetId === undefined) {
    return `${capitalize(frequencyField)} Cohort`
  }

  const [ancestryGroupId, sexId] = getAncestryAndSexIds(subsetId)

  if (ancestryGroupId) {
    const ancestryGroupName = POPULATION_NAMES[ancestryGroupId]
    if (sexId) {
      return `${capitalize(frequencyField)} ${ancestryGroupName} ${sexId} Ancestry Group`
    }
    return `${capitalize(frequencyField)} ${ancestryGroupName} Ancestry Group`
  }
  return sexId!
}

const cohortForSubset = (subset: Subset, frequencyField: 'exome' | 'genome'): Cohort => {
  if (!subset.id) {
    return { id: 'ALL', label: capitalize(frequencyField), characteristics: null }
  }

  const [ancestryGroupId, sexId] = getAncestryAndSexIds(subset.id)

  const sexCharacteristics: CohortCharacteristic[] = sexId
    ? [{ name: 'biological sex', value: sexId }]
    : []
  const ancestryCharacteristics: CohortCharacteristic[] =
    ancestryGroupId && POPULATION_NAMES[ancestryGroupId]
      ? [
          {
            name: 'genetic ancestry',
            value: POPULATION_NAMES[ancestryGroupId],
          },
        ]
      : []
  const characteristics = [...sexCharacteristics, ...ancestryCharacteristics]

  return {
    id: subset.id || 'ALL',
    label: cohortDescription(subset.id, frequencyField),
    characteristics,
  }
}

const resolveVACohortAlleleFrequency = (
  focusAllele: Allele,
  variant_id: string,
  subset: Subset,
  frequencyField: 'exome' | 'genome'
): CohortAlleleFrequencyWithoutSubcohorts => {
  const idSuffix = subset.id ? `.${subset.id}` : ''
  const id = `gnomad4:${variant_id}${idSuffix}`
  const label = `${cohortDescription(subset.id, frequencyField)} Allele Frequency for ${variant_id}`

  const cohort = cohortForSubset(subset, frequencyField)

  const ancillaryResults = {
    grpMaxFAF95: subset.grpMax || null,
    jointGrpMaxFAF95: subset.jointGrpMax || null,
    homozygotes: subset.homozygote_count !== undefined ? subset.homozygote_count : null,
    hemizygotes: subset.hemizygote_count !== undefined ? subset.hemizygote_count : null,
  }

  return {
    id,
    label,
    type: 'CohortAlleleFrequency',
    focusAllele,
    derivedFrom: GNOMAD_V4_DERIVATION,
    focusAlleleCount: subset.ac,
    locusAlleleCount: subset.an,
    alleleFrequency: subset.ac / subset.an,
    cohort,
    ancillaryResults,
    qualityMeasures: subset.qualityMeasures,
  }
}

const findSubcohortIds = (cohortId: string, possibleSubcohortIds: string[]): string[] => {
  const otherCohortIds = possibleSubcohortIds.filter((otherId) => otherId !== cohortId)

  const suffix = cohortId.split('.')[1] || ''

  if (suffix === 'XX' || suffix === 'XY') {
    return otherCohortIds.filter((otherCohortId) => otherCohortId.endsWith(suffix))
  }

  return otherCohortIds.filter((otherCohortId) => otherCohortId.startsWith(cohortId))
}

/* Quick refresher to save you checking Wikipedia at this point: topo sort
 * takes a list of items that can have dependencies from one item to another,
 * and returns them in an order such that, if A depends on B, B is guaranteed
 * to appear before A in the output. The classic example is what package
 * managers (npm, apt, rubygems, etc.) do: you want to install package A,
 * which depends on B and C, and B in turn depends on D and E. The package
 * manager will make sure that D and E are installed before it tries to
 * install B, that B and C are installed before A, and so on. However, the
 * order between B and C isn't guaranteed either way, since neither of them
 * depends on the other, either directly or indirectly.
 *
 * In this particular case, we're ordering subcohorts, and we say A depends on
 * B if B is a subset of A. The reason we use this definition is that our
 * ultimate goal is to fill in the subcohortFrequency field for each
 * CohortAlleleFrequency. subcohortFrequency contains a list of
 * CohortAlleleFrequency, each of which will also contain its own (possibly
 * empty) list of its own subcohorts in its subcohortFrequency field, so
 * to compute the subcohortFrequency for A, first we must fill in B's, and so
 * on recursively.
 */

const topologicalSortLoop = (
  subcohortMap: Record<string, string[]>,
  remaining: string[],
  sorted: string[]
): string[] => {
  if (remaining.length === 0) {
    return sorted
  }

  const nextEligible = remaining.find((cohortId) => {
    const subcohortIds = subcohortMap[cohortId]
    return subcohortIds.every((subcohortId) => sorted.includes(subcohortId))
  })!

  const newRemaining = remaining.filter((cohortId) => cohortId !== nextEligible)
  const newSorted = [...sorted, nextEligible]
  return topologicalSortLoop(subcohortMap, newRemaining, newSorted)
}

const topologicalSort = (cohortIds: string[]): string[] => {
  const subcohortMap: Record<string, string[]> = cohortIds.reduce((acc, cohortId) => {
    const subcohortIds = findSubcohortIds(cohortId, cohortIds)

    return { ...acc, [cohortId]: subcohortIds }
  }, {})

  return topologicalSortLoop(subcohortMap, Object.keys(subcohortMap), [])
}

const addSubcohorts = (
  cohortsWithoutSubcohorts: CohortAlleleFrequencyWithoutSubcohorts[]
): CohortAlleleFrequency[] => {
  const cohortsById: Record<string, CohortAlleleFrequencyWithoutSubcohorts> =
    cohortsWithoutSubcohorts.reduce((acc, cohort) => ({ ...acc, [cohort.id]: cohort }), {})
  const cohortIds = cohortsWithoutSubcohorts.map((cohort) => cohort.id)

  const sortedCohortIds: string[] = topologicalSort(cohortIds)

  const subcohortMap: Record<string, CohortAlleleFrequency> = sortedCohortIds.reduce(
    (acc, cohortId) => {
      const cohort: CohortAlleleFrequencyWithoutSubcohorts = cohortsById[cohortId]
      const subcohorts: CohortAlleleFrequency[] = findSubcohortIds(cohortId, cohortIds).map(
        (subcohortId) => acc[subcohortId]
      )
      const filledInCohort: CohortAlleleFrequency = { ...cohort, subcohortFrequency: subcohorts }
      return { ...acc, [cohortId]: filledInCohort }
    },
    {} as Record<string, CohortAlleleFrequency>
  )
  return Object.values(subcohortMap)
}

type ESFrequencies = {
  quality_metrics: {
    allele_balance: {
      alt?: {
        bin_freq: number[]
      }
    }
  }
}

const calculateHeterozygousSkewedAlleleCount = (frequencies: ESFrequencies): number | null => {
  const { alt } = frequencies.quality_metrics.allele_balance
  if (!alt) {
    return null
  }

  return alt.bin_freq[18] + alt.bin_freq[19]
}

const resolveVACohortAlleleFrequencies = async (
  obj: any,
  args: any,
  ctx: any,
  frequencyField: 'exome' | 'genome'
): Promise<CohortAlleleFrequency[] | null> => {
  const focusAllele = await resolveVAAllele(obj, args, ctx)
  if (focusAllele === null) {
    return null
  }

  const frequencies = obj[frequencyField]
  if (!frequencies) {
    return null
  }
  const coverage = obj.coverage[frequencyField]

  const qualityMeasures = {
    meanDepth: coverage && coverage.mean ? coverage.mean : null,
    fractionCoverage20x: coverage && coverage.over_20 ? coverage.over_20 : null,
    qcFilters: frequencies.filters,
    monoallelic: frequencies.flags.includes('monoallelic'),
    lowComplexityRegion: obj.flags.includes('lcr'),
    lowConfidenceLossOfFunctionError: obj.flags.includes('lc_lof'),
    lossOfFunctionWarning: obj.flags.includes('lof_flag'),
    heterozygousSkewedAlleleCount: calculateHeterozygousSkewedAlleleCount(frequencies),
  }

  const fullSet: Subset = {
    ac: frequencies.ac,
    an: frequencies.an,
    hemizygote_count: frequencies.hemizygote_count,
    homozygote_count: frequencies.homozygote_count,
    grpMax: frequencies && {
      frequency: frequencies.faf95.popmax,
      groupId: frequencies.faf95.popmax_population,
      confidenceInterval: 0.95,
    },
    jointGrpMax:
      obj.joint && obj.joint.fafmax && obj.joint.fafmax.faf95_max
        ? {
            frequency: obj.joint.fafmax.faf95_max,
            groupId: obj.joint.fafmax.faf95_max_gen_anc,
            confidenceInterval: 0.95,
          }
        : undefined,
    qualityMeasures,
  }
  const subsets = [fullSet, ...(frequencies.ancestry_groups as Subset[])]
  const cohortsWithoutSubcohorts = subsets.map((subset) =>
    resolveVACohortAlleleFrequency(focusAllele, obj.variant_id, subset, frequencyField)
  )

  return addSubcohorts(cohortsWithoutSubcohorts)
}

export const resolveVAExome = async (obj: any, args: any, ctx: any) =>
  resolveVACohortAlleleFrequencies(obj, args, ctx, 'exome')

export const resolveVAGenome = async (obj: any, args: any, ctx: any) =>
  resolveVACohortAlleleFrequencies(obj, args, ctx, 'genome')
