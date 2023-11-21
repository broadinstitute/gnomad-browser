import { textOrMissingTextWarning } from '../browser/src/missingContent'

export const GNOMAD_POPULATION_NAMES = {
  afr: 'African/African American',
  ami: 'Amish',
  amr: 'Admixed American',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  mid: 'Middle Eastern',
  eur: 'European',
  nfe: 'European (non-Finnish)',
  fin: 'European (Finnish)',
  oth: 'Remaining individuals',
  sas: 'South Asian',
  remaining: 'Remaining',

  // EAS subpopulations
  eas_jpn: 'Japanese',
  eas_kor: 'Korean',
  eas_oea: 'Other East Asian',

  // NFE subpopulations
  nfe_bgr: 'Bulgarian',
  nfe_est: 'Estonian',
  nfe_nwe: 'North-western European',
  nfe_onf: 'Other non-Finnish European',
  nfe_seu: 'Southern European',
  nfe_swe: 'Swedish',
} as const

export type PopulationId = keyof typeof GNOMAD_POPULATION_NAMES

export const populationName = (populationId: string) =>
  textOrMissingTextWarning('genetic ancestry group name', GNOMAD_POPULATION_NAMES, populationId)

const ExACPopulations: PopulationId[] = ['sas', 'afr', 'amr', 'eas', 'fin', 'nfe', 'remaining']
const v2Populations: PopulationId[] = ['afr', 'nfe', 'afr', 'asj', 'eas', 'fin', 'sas', 'remaining']
const v3Populations: PopulationId[] = [
  'nfe',
  'amr',
  'eur',
  'ami',
  'eas',
  'mid',
  'afr',
  'sas',
  'asj',
  'remaining',
]
const v4Populations: PopulationId[] = [
  'afr',
  'amr',
  'asj',
  'eas',
  'fin',
  'mid',
  'nfe',
  'ami', // v4 does not directly include amish, but v3 does and v4 genomes are from v3
  'sas',
  'remaining',
]
const allPopulations: PopulationId[] = [
  'afr',
  'ami',
  'amr',
  'asj',
  'eas',
  'mid',
  'eur',
  'nfe',
  'fin',
  'oth',
  'sas',
  'remaining',
]

export const populationsInDataset = {
  ExAC: ExACPopulations,
  v2: v2Populations,
  v3: v3Populations,
  v4: v4Populations,
  default: allPopulations,
}
