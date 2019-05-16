export default {
  browserTitle: 'ASC browser',
  navBarTitle: 'Autism Sequencing Consortium exome analysis',
  navBarColor: '#23509c',
  elasticsearch: {
    geneResults: {
      index: 'asc_gene_results_2019_04_14',
      type: 'result',
    },
    variants: {
      index: 'asc_variant_results_2019_04_16',
      type: 'variant',
    },
  },
  geneResults: {
    resultsPageHeading: 'Results',
    views: {
      manhattan: false,
      qq: false,
    },
    groups: {
      options: ['All'],
      labels: {
        All: 'All',
      },
    },
    defaultSortColumn: 'qval',
    columns: [
      {
        key: 'xcase_dn_ptv',
        heading: 'De\u00a0Novo PTV Cases',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcont_dn_ptv',
        heading: 'De\u00a0Novo PTV Controls',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcase_dn_misa',
        heading: 'De\u00a0Novo MisA Cases',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcont_dn_misa',
        heading: 'De\u00a0Novo MisA Controls',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcase_dn_misb',
        heading: 'De\u00a0Novo MisB Cases',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcont_dn_misb',
        heading: 'De\u00a0Novo MisB Controls',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcase_dbs_ptv',
        heading: 'DBS PTV Cases',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcont_dbs_ptv',
        heading: 'DBS PTV controls',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcase_swe_ptv',
        heading: 'SWE PTV Cases',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcont_swe_ptv',
        heading: 'SWE PTV Controls',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcase_tut',
        heading: 'TUT Cases',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'xcont_tut',
        heading: 'TUT Controls',
        minWidth: 70,
        grow: 0,
        type: 'int',
      },
      {
        key: 'qval',
        heading: 'Q\u2011Val',
        minWidth: 100,
        grow: 0,
      },
    ],
  },
  variants: {
    groups: {
      options: ['ASC_DN', 'SWE', 'DBS'],
      labels: {
        ASC_DN: 'ASC_DN',
        SWE: 'SWE',
        DBS: 'DBS',
      },
    },
    consequences: [], // ASC data uses VEP consequence terms, so no extra terms need to be registered
    columns: [
      {
        key: 'in_analysis',
        heading: 'In Analysis',
        minWidth: 85,
        render: value => (value ? 'yes' : ''),
        renderForCSV: value => (value ? 'yes' : ''),
        showOnDetails: false,
        showOnGenePage: true,
      },
    ],
  },
}
