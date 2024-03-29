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
    term: 'intragenic_exon_dup',
    label: 'int. exon duplication',
    category: 'dup_lof',
  },
  {
    term: 'partial_exon_dup',
    label: 'partial exon duplication',
    category: 'dup_lof',
  },

  {
    term: 'copy_gain',
    label: 'copy gain',
    category: 'copy_gain',
  },
  {
    term: 'tss_dup',
    label: 'TSS duplication',
    category: 'other',
  },
  {
    term: 'dup_partial',
    label: 'partial duplication',
    category: 'other',
  },
  {
    term: 'partial_dispersed_dup',
    label: 'partial dispersed duplication',
    category: 'other',
  },
  {
    term: 'breakend_exonic',
    label: 'exonic breakend',
    category: 'other',
  },
  {
    term: 'msv_exon_ovr',
    label: 'MCNV overlap',
    category: 'other',
  },
  {
    term: 'msv_exon_overlap',
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

export const svConsequences = rankedConsequences.map((csq) => csq.term)

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
  lof: 'pLoF',
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
