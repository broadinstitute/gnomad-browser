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
