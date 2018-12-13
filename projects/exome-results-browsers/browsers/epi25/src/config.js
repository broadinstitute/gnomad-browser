export default {
  pageTitle: 'Epi25 WES browser',
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
    categories: [
      { id: 'lof', label: 'LoF' },
      { id: 'mpc', label: 'MPC' },
      { id: 'infrIndel', label: 'Inframe Indel' },
    ],
  },
  analysisGroups: {
    overallGroup: 'EPI',
    selectableGroups: ['EPI', 'DEE', 'GGE', 'NAFE'],
  },
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
}
