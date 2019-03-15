const rankedConsequences = [
  {
    term: 'lof',
    label: 'loss of function',
    category: 'lof',
  },
  {
    term: 'dup_lof',
    label: 'int. exon duplication',
    category: 'dup_lof',
  },
  {
    term: 'copy_gain',
    label: 'copy gain',
    category: 'copy_gain',
  },
  {
    term: 'dup_partial',
    label: 'partial duplication',
    category: 'other',
  },
  {
    term: 'msv_exon_ovr',
    label: 'MCNV overlap',
    category: 'other',
  },
  {
    term: 'intronic',
    label: 'intronic',
    category: 'other',
  },
  {
    term: 'inv_span',
    label: 'inversion span',
    category: 'other',
  },
  {
    term: 'utr',
    label: 'utr',
    category: 'other',
  },
  {
    term: 'promoter',
    label: 'promoter',
    category: 'other',
  },
  {
    term: 'intergenic',
    label: 'intergenic',
    category: 'other',
  },
]

export const svConsequences = rankedConsequences.map(csq => csq.term)

export const svConsequenceCategories = rankedConsequences.reduce(
  (acc, csq) => ({
    ...acc,
    [csq.term]: csq.category,
  }),
  Object.create(null)
)

export const svConsequenceLabels = rankedConsequences.reduce(
  (acc, csq) => ({
    ...acc,
    [csq.term]: csq.label,
  }),
  Object.create(null)
)

export const svConsequenceCategoryLabels = {
  lof: 'LoF',
  dup_lof: 'Int. exon duplication',
  copy_gain: 'Copy gain',
  other: 'Other',
}

export const svConsequenceCategoryColors = {
  lof: '#D43925',
  dup_lof: '#7459B2',
  copy_gain: '#2376B2',
  other: '#424242',
}
