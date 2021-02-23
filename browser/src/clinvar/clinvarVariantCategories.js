export const CLINICAL_SIGNIFICANCE_CATEGORIES = ['pathogenic', 'uncertain', 'benign', 'other']

const CLINICAL_SIGNIFICANCE_GROUPS = {
  pathogenic: new Set([
    'Pathogenic',
    'Likely pathogenic',
    'Pathogenic/Likely pathogenic',
    'association',
    'risk factor',
  ]),
  uncertain: new Set([
    'Uncertain significance',
    'Conflicting interpretations of pathogenicity',
    'conflicting data from submitters',
  ]),
  benign: new Set(['Benign', 'Likely benign', 'Benign/Likely benign']),
  other: new Set([
    'other',
    'drug response',
    'Affects',
    'protective',
    'no interpretation for the single variant',
    'not provided',
    'association not found',
  ]),
}

export const clinvarVariantClinicalSignificanceCategory = variant => {
  const clinicalSignificances = variant.clinical_significance.split(', ')

  if (clinicalSignificances.some(s => CLINICAL_SIGNIFICANCE_GROUPS.pathogenic.has(s))) {
    return 'pathogenic'
  }
  if (clinicalSignificances.some(s => CLINICAL_SIGNIFICANCE_GROUPS.uncertain.has(s))) {
    return 'uncertain'
  }
  if (clinicalSignificances.some(s => CLINICAL_SIGNIFICANCE_GROUPS.benign.has(s))) {
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
