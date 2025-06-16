import { textOrMissingTextWarning } from '../browser/src/missingContent'
import { DatasetId, getTopLevelDataset } from './metadata'

export const GNOMAD_POPULATION_NAMES = {
  afr: 'African/African American',
  ami: 'Amish',
  amr: 'Admixed American',
  asj: 'Ashkenazi Jewish',
  // eas: 'East Asian',
  // mid: 'Middle Eastern',
  // eur: 'European',
  nfe: 'European (non-Finnish)',
  fin: 'European (Finnish)',
  oth: 'Remaining individuals',
  sas: 'South Asian',
  rmi: 'Remaining',
  remaining: 'Remaining',

  // Custom OurDNA definitions
  csa: 'CSA (Central South Asian)',
  eas: 'EAS (East Asian)',
  eur: 'EUR (European)',
  fil: 'FIL (Filipino)',
  mid: 'MID (Middle Eastern)',
  unclassified: 'Unclassified',


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

export const LOCAL_ANCESTRY_NAMES = {
  african: 'African',
  amerindigenous: 'Amerindigenous',
  european: 'European',
} as const

export type PopulationId = keyof typeof GNOMAD_POPULATION_NAMES
export type LocalAncestryPopulationId = keyof typeof LOCAL_ANCESTRY_NAMES
export type FullLocalAncestryPopulationId = `${PopulationId}_${LocalAncestryPopulationId}`

export type PopulationIdAndChromosome =
  | PopulationId
  | `${PopulationId}_XX`
  | `${PopulationId}_XY`
  | 'XX'
  | 'XY'

export const populationName = (populationId: string) =>
  textOrMissingTextWarning('genetic ancestry group name', GNOMAD_POPULATION_NAMES, populationId.toLowerCase())

const ExACPopulations: PopulationId[] = ['sas', 'afr', 'amr', 'eas', 'fin', 'nfe', 'remaining']
const v2Populations: PopulationId[] = ['amr', 'nfe', 'afr', 'asj', 'eas', 'fin', 'sas', 'oth']
const v3Populations: PopulationId[] = [
  'nfe',
  'fin',
  'amr',
  'ami',
  'eas',
  'mid',
  'afr',
  'sas',
  'asj',
  'oth',
]
const v4Populations: PopulationId[] = [
  'unclassified',
  'csa',
  'eas',
  'eur',
  'fil',
  'mid'
]

export const populationsInDataset = {
  ExAC: ExACPopulations,
  v2: v2Populations,
  v3: v3Populations,
  v4: v4Populations,
  default: [],
}

export const getPopulationsInDataset = (datasetId: DatasetId): PopulationId[] => {
  const topLeveDataset = getTopLevelDataset(datasetId)
  return populationsInDataset[topLeveDataset]
}
