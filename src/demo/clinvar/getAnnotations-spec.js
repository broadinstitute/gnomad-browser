import expect from 'expect'
import R from 'ramda'

import clinvarCHD7 from 'data/clinvar-CHD7.json'  // eslint-disable-line

export const getClinicalSignificances = R.pipe(
  R.path(['info', 'CLINICAL_SIGNIFICANCE']),
  significance => significance.split('|'),
)

// :: [Variants] -> [Strings]
export const uniqueSignificances = R.pipe(
  R.map(getClinicalSignificances),
  R.flatten,
  R.uniq,
)

describe('clinvar parsing', () => {
  it('has fields', () => {
    expect(Object.keys(clinvarCHD7.gene.clinvar_variants[0].info)).toEqual([
      'CLINICAL_SIGNIFICANCE',
      'ALL_PMIDS',
      'ALLELE_ID',
      'RCV',
      'DISEASE_MECHANISM',
      'INHERITANCE_MODES',
      'BENIGN',
      'MEASURESET_ID',
      'ORIGIN',
      'CONFLICTED',
      'PREVALENCE',
      'SYMBOL',
      'ALL_TRAITS',
      'AGE_OF_ONSET',
      'HGVS_P',
      'HGVS_C',
      'GOLD_STARS',
      'PATHOGENIC',
      'REVIEW_STATUS',
      'ALL_SUBMITTERS',
      'XREFS',
      'MEASURESET_TYPE',
      'MOLECULAR_CONSEQUENCE',
    ])
  })

  it('add significance field to variant', () => {
    const variants = clinvarCHD7.gene.clinvar_variants.map(variant => ({
      ...variant,
      significances: getClinicalSignificances(variant),
    }))
    expect(variants[0].significances).toEqual(['Uncertain_significance'])
    expect(variants[23].significances).toEqual(['Pathogenic'])
  })

  it('getUniqueSignificances', () => {
    const significances = uniqueSignificances(clinvarCHD7.gene.clinvar_variants)
    expect(significances).toEqual([
      'Uncertain_significance',
      'Likely_benign',
      'Likely_pathogenic',
      'Pathogenic',
      'Benign',
      'not_provided'
    ])
  })

  const significanceCategories = [
    { annotation: 'Pathogenic', colour: '#FF2B00' },
    { annotation: 'Likely_pathogenic', colour: '#E88000' },
    { annotation: 'Uncertain_significance', colour: '#FFD300' },
    { annotation: 'Likely_benign', colour: '#A1E80C' },
    { annotation: 'Benign', colour: '#0DFF3C' },
    { annotation: 'not_provided', colour: '#9B988F' },
  ]

  it('description', () => {
    const variants = clinvarCHD7.gene.clinvar_variants.map(variant => ({
      ...variant,
      significances: getClinicalSignificances(variant),
    }))
  })
})
