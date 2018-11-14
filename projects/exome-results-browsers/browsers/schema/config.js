module.exports = {
  pageTitle: 'schema',
  navBarTitle: 'Schizophrenia exome meta-analysis',
  navBarColor: '#0a79bf',
  elasticsearch: {
    analysisGroups: {
      index: 'schizophrenia_exome_variants_groups',
      type: 'schizophrenia_exome_group',
    },
    geneResults: {
      index: 'schizophrenia_gene_results_171213',
      type: 'result',
    },
    variants: {
      index: 'schizophrenia_exome_variants_results',
      type: 'schizophrenia_exome_variant',
    },
  },
  geneResults: {
    resultsPageHeading: 'Exome meta-analysis results',
    categories: [{ id: 'lof', label: 'LoF' }, { id: 'mpc', label: 'MPC' }],
  },
  analysisGroups: {
    overallGroup: 'all',
  },
  consequences: [
    {
      term: 'lof',
      label: 'loss of function',
      category: 'lof',
    },
    {
      term: 'stoplost',
      label: 'stop lost',
      category: 'missense',
    },
    {
      term: 'startlost',
      label: 'start lost',
      category: 'missense',
    },
    {
      term: 'mis',
      label: 'missense',
      category: 'missense',
    },
    {
      term: 'ns',
      label: 'inframe indel',
      category: 'missense',
    },
    {
      term: 'syn',
      label: 'synonymous',
      category: 'synonymous',
    },
    {
      term: 'splice',
      label: 'splice region',
      category: 'other',
    },
  ],
}
