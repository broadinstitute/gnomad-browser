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

const sczMockDb = { getSczVariants }

export default sczMockDb
