import { getCategoryFromConsequence } from '../vepConsequences'

export const CLINICAL_SIGNIFICANCE_CATEGORIES = ['pathogenic', 'uncertain', 'benign', 'other']

const CLINICAL_SIGNIFICANCE_GROUPS = {
  pathogenic: new Set([
    'Pathogenic',
    'Pathogenic/Likely pathogenic',
    'Likely pathogenic',
    'association',
    'risk factor',
  ]),
  uncertain: new Set([
    'Uncertain significance',
    'Conflicting interpretations of pathogenicity',
    'Conflicting classifications of pathogenicity',
    'conflicting data from submitters',
  ]),
  benign: new Set(['Likely benign', 'Benign/Likely benign', 'Benign']),
  other: new Set([
    'other',
    'drug response',
    'Affects',
    'protective',
    'no interpretation for the single variant',
    'no classification for the single variant',
    'not provided',
    'association not found',
  ]),
} as const

const buildPriorityMapping = () => {
  const mapping: { [key: string]: number } = {}

  return CLINICAL_SIGNIFICANCE_CATEGORIES.reduce((acc, category, categoryIndex) => {
    const group = CLINICAL_SIGNIFICANCE_GROUPS[category as ClinicalSignificance]
    const groupArray = Array.from(group)

    groupArray.forEach((significance, index) => {
      acc[significance] = categoryIndex * groupArray.length + index + 1
    })

    return acc
  }, mapping)
}

export const CLINICAL_SIGNIFICANCE_SORT_PRIORITY = buildPriorityMapping()

export type ClinicalSignificance = keyof typeof CLINICAL_SIGNIFICANCE_GROUPS

export const clinvarVariantClinicalSignificanceCategory = (variant: any) => {
  const clinicalSignificances = variant.clinical_significance.split(', ')

  if (clinicalSignificances.some((s: any) => CLINICAL_SIGNIFICANCE_GROUPS.pathogenic.has(s))) {
    return 'pathogenic'
  }
  if (clinicalSignificances.some((s: any) => CLINICAL_SIGNIFICANCE_GROUPS.uncertain.has(s))) {
    return 'uncertain'
  }
  if (clinicalSignificances.some((s: any) => CLINICAL_SIGNIFICANCE_GROUPS.benign.has(s))) {
    return 'benign'
  }
  return 'other'
}

export const CLINICAL_SIGNIFICANCE_CATEGORY_LABELS = {
  pathogenic: 'Pathogenic / likely pathogenic',
  uncertain: 'Uncertain significance / conflicting',
  benign: 'Benign / likely benign',
  other: 'Other',
}

export const CLINICAL_SIGNIFICANCE_CATEGORY_COLORS = {
  pathogenic: '#E6573D',
  uncertain: '#FAB470',
  benign: '#5E6F9E',
  other: '#bababa',
}

export const CONSEQUENCE_CATEGORIES = [
  'frameshift',
  'other_lof',
  'missense',
  'splice_region',
  'synonymous',
  'other',
]

export const CONSEQUENCE_CATEGORY_LABELS = {
  frameshift: 'Frameshift',
  other_lof: 'Other pLoF',
  missense: 'Missense',
  splice_region: 'Splice region',
  synonymous: 'Synonymous',
  other: 'Other',
}

export const clinvarVariantConsequenceCategory = (variant: any) => {
  const consequence = variant.major_consequence
  const consequenceCategory = getCategoryFromConsequence(consequence)

  if (consequence === 'frameshift_variant') {
    return 'frameshift'
  }
  if (consequenceCategory === 'lof') {
    return 'other_lof'
  }
  if (consequenceCategory === 'missense') {
    return 'missense'
  }
  if (consequence === 'splice_region_variant') {
    return 'splice_region'
  }
  if (consequence === 'synonymous_variant') {
    return 'synonymous'
  }
  return 'other'
}
