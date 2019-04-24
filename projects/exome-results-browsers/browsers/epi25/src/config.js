const renderPVal = value => {
  if (value === null) {
    return ''
  }
  const truncated = Number(value.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}

export default {
  browserTitle: 'Epi25 WES browser',
  navBarTitle: 'Epi25 WES browser',
  navBarColor: '#4e3c81',
  elasticsearch: {
    geneResults: {
      index: 'epi25_gene_results_181107',
      type: 'result',
    },
    variants: {
      index: 'epi25_variant_results_2018_11_27',
      type: 'variant',
    },
  },
  geneResults: {
    resultsPageHeading: 'Epi25 WES: gene burden results',
    defaultSortColumn: 'pval_meta',
    columns: [
      {
        key: 'xcase_lof',
        heading: 'Case LoF',
        minWidth: 60,
        type: 'int',
      },
      {
        key: 'xctrl_lof',
        heading: 'Control LoF',
        minWidth: 60,
        type: 'int',
      },
      {
        key: 'pval_lof',
        heading: 'P-Val LoF',
        minWidth: 80,
        render: renderPVal,
      },
      {
        key: 'xcase_mpc',
        heading: 'Case MPC',
        minWidth: 60,
        type: 'int',
      },
      {
        key: 'xctrl_mpc',
        heading: 'Control MPC',
        minWidth: 60,
        type: 'int',
      },
      {
        key: 'pval_mpc',
        heading: 'P-Val MPC',
        minWidth: 80,
        render: renderPVal,
      },
      {
        key: 'xcase_infrIndel',
        heading: 'Case Inframe Indel',
        minWidth: 60,
        type: 'int',
      },
      {
        key: 'xctrl_infrIndel',
        heading: 'Control Inframe Indel',
        minWidth: 60,
        type: 'int',
      },
      {
        key: 'pval_infrIndel',
        heading: 'P-Val Inframe Indel',
        minWidth: 80,
        render: renderPVal,
      },
      {
        key: 'pval_meta',
        heading: 'P-Val',
        minWidth: 80,
        render: renderPVal,
      },
    ],
  },
  analysisGroups: {
    defaultGroup: 'EPI',
    selectableGroups: ['EPI', 'DEE', 'GGE', 'NAFE'],
    labels: {
      EPI: 'EPI',
      DEE: 'DEE',
      GGE: 'GGE',
      NAFE: 'NAFE',
    },
  },
  variants: {
    consequences: [
      {
        term: 'loss of function',
        category: 'lof',
      },
      {
        term: 'inframe indel',
        category: 'missense',
      },
      {
        term: 'missense',
        category: 'missense',
      },
      {
        term: 'other missense',
        category: 'missense',
      },
      {
        term: 'damaging missense',
        category: 'missense',
      },
      {
        term: 'damaging missense (MPC)',
        category: 'missense',
      },
      {
        term: 'synonymous',
        category: 'synonymous',
      },
      {
        term: 'splice_region',
        category: 'other',
      },
    ],
    columns: [
      {
        key: 'est',
        heading: 'Estimate',
        minWidth: 80,
        tooltip:
          'For variants with an overall AF>0.001, an association odds ratio, standard error, and p-value are estimated using Firth’s logistic regression correcting for sex and the first 10 principal components',
        showOnGenePage: true,
      },
      {
        key: 'se',
        heading: 'SE',
        minWidth: 65,
        tooltip:
          'For variants with an overall AF>0.001, an association odds ratio, standard error, and p-value are estimated using Firth’s logistic regression correcting for sex and the first 10 principal components',
        showOnGenePage: true,
      },
      {
        key: 'p',
        heading: 'P-Val',
        minWidth: 65,
        tooltip:
          'For variants with an overall AF>0.001, an association odds ratio, standard error, and p-value are estimated using Firth’s logistic regression correcting for sex and the first 10 principal components',
        showOnGenePage: true,
      },
      {
        key: 'in_analysis',
        heading: 'In Analysis',
        minWidth: 85,
        tooltip: 'Was this variant used in gene burden analysis.',
        render: value => (value ? 'yes' : ''),
        renderForCSV: value => (value ? 'yes' : ''),
        showOnDetails: false,
        showOnGenePage: true,
      },
    ],
  },
}
