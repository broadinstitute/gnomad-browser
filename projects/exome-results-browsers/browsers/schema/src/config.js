export default {
  pageTitle: 'schema',
  navBarTitle: 'Schizophrenia exome meta-analysis',
  navBarColor: '#0a79bf',
  elasticsearch: {
    geneResults: {
      index: 'schema_gene_results_2019_04_15',
      type: 'result',
    },
    variants: {
      index: 'schema_variant_results_2019_04_15',
      type: 'variant',
    },
  },
  geneResults: {
    resultsPageHeading: 'Exome meta-analysis results',
    categories: [{ id: 'lof', label: 'LoF' }, { id: 'mis', label: 'Missense' }],
  },
  analysisGroups: {
    defaultGroup: 'meta',
    selectableGroups: ['meta'],
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
  variantTable: {
    tooltips: {},
  },
}
