module.exports = {
  pageTitle: 'epi25k',
  navBarTitle: 'EPI25K',
  navBarColor: 'red',
  elasticsearch: {
    analysisGroups: {
      index: 'epi_exome_variants_groups_180925',
      type: 'epi_exome_group',
    },
    geneResults: {
      index: 'epi_exome_gene_results_180925',
      type: 'result',
    },
    variants: {
      index: 'epi_exome_variants_results_180925',
      type: 'epi_exome_variant',
    },
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
  ],
}
