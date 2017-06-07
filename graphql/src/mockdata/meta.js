// mock data for meta browser

const exampleStudyOrPopulation = name => ({
  population_name: name,
  study_name: name,
  phe_hom_ref: 980,
  phe_het: 840,
  phe_hom_alt: 180,
  phe_allele_frequency: 0.3,
  hc_hom_ref: 519,
  hc_het: 403,
  hc_hom_alt: 78,
  hc_allele_frequency: 0.28,
  odds_ratio: 1.102,
  se: 0.06,
  p_value: 0.1065,
  info: 1,
  n_denovo: 1,
})

const exampleVariant = (populations, studies) => ({
  chr: '1',
  pos: 100111956,
  ref: 'A',
  alt: 'G',
  n_study: 3,
  study: '??+++',
  p_value: 0.3922,
  scz_af: 0.31,
  hc_af: 0.29,
  odds_ratio: 1.05,
  se: 0.62,
  imputation_quality: 1,
  qp: 0.2686,
  i_squared: 53.7742,
  mantel_haenszel_p: 0.2846,
  studies: studies.map(study => exampleStudyOrPopulation(study)),
  populations: populations.map(population => exampleStudyOrPopulation(population)),
})

const metaDb = {
  meta_schizophrenia: {
    metaMetaData: {
      meta_file_format_version: '0.99',
      analytic_pipeline: 'RICOPILI',
      analytic_pipeline_version: '2016_12_1',
      sharing: 'Limited, only people who have signed 23andMe DTA',
      title: 'PGC primary MDD analysis',
      date: '31 Jan 2017 13:26 CET',
      analysts: ['Stephan Ripke', 'Charite', 'Berlin'],
      contact: 'Mark Daly, MGH',
      genome_build: 'GRCh37/hg19',
      imputation_reference: '1000 Genomes Project, phase 3',
      chromosomes: [
        '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14',
        '15', '16', '17', '18', '19', '20', '21',
        '22', 'X', 'Y', 'XY',
      ],
      case_definition: 'SCZ',
      control_definition: 'no SCZ, no BIP',
      diagnosis_definition: 'Includes register and self-report data',
      number_of_cohorts: 5,
      study_cohort_ids: [
        'mdd_boma_eur mdd_cof3_eur',
        'mdd_col3_eur mdd_edi2_eur',
        'mdd_gens_eur mdd_gep3_eur',
      ],
      // population_definitions: {
      //   european_non_finnish: 'non-Finish European',
      //   east_asian: 'east_asian',
      // },
      final_number_of_cases: 16326,
      final_number_of_controls: 23456,
    },
    variants: [
      exampleVariant(
        ['Taiwanese', 'Swedish', 'Ashkenazi Jewish'],
        ['UK10K', 'mclean']
      ),
      exampleVariant(
        ['Taiwanese', 'Swedish', 'Ashkenazi Jewish'],
        ['UK10K', 'mclean']
      ),
      exampleVariant(
        ['Taiwanese', 'Swedish', 'Ashkenazi Jewish'],
        ['UK10K', 'mclean']
      ),
    ],
  },
}

const getSczVariants = () => new Promise((resolve, reject) =>
  resolve(metaDb.meta_schizophrenia.variants)
)

const getSczMetaData = () => new Promise((resolve, reject) =>
  resolve(metaDb.meta_schizophrenia.metaMetaData)
)

const sczMockDb = { getSczVariants, getSczMetaData }

export default sczMockDb
