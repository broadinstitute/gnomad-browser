/* eslint-disable camelcase */
/* eslint-disable no-param-reassign */
/* eslint-disable quote-props */
/* eslint-disable quotes */
import test from 'tape'  // eslint-disable-line
import data from '@resources/1505910855-variantfx-myh7.json'  // eslint-disable-line

import {
  processCardioVariant,
  getConsequenceBreakdown,
  sumCohorts,
  burdenCalculations,
} from '../src/utilities'

test('Expected keys', (assert) => {
  const geneKeys = Object.keys(data)
  const geneExpected = [
    'gene_id',
    'gene_name',
    'omim_accession',
    'full_gene_name',
    'start',
    'stop',
    'xstart',
    'xstop',
    'transcript',
    'exons',
    'variants'
  ]
  assert.deepEqual(geneExpected, geneKeys)
  const variantKeys = Object.keys(data.variants[0])
  const variantExpected = [ 'variant_id', 'chrom', 'ref', 'alt', 'rsid', 'filter', 'pos', 'xpos', 'ENST', 'Consequence', 'SYMBOL', 'SYMBOL_SOURCE', 'ENSG', 'Feature', 'BIOTYPE', 'HGVSc', 'HGVSp', 'cDNA_position', 'CDS_position', 'Protein_position', 'Amino_acids', 'Codons', 'Existing_variation', 'STRAND', 'CANONICAL', 'CCDS', 'ENSP', 'SIFT', 'PolyPhen', 'ExAC_MAF', 'PUBMED', 'DP', 'FS', 'MLEAC', 'MLEAF', 'MQ', 'MQ0', 'QD', 'EGY_DCM_EGY_AC', 'EGY_DCM_EGY_AN', 'EGY_HCM_EGY_AC', 'EGY_HCM_EGY_AN', 'EGY_HVO_EGY_AC', 'EGY_HVO_EGY_AN', 'EGY_DCM_HH', 'EGY_HCM_HH', 'EGY_HVO_HH', 'SGP_DCM_SAS_AC', 'SGP_DCM_SAS_AN', 'SGP_HCM_SAS_AC', 'SGP_HCM_SAS_AN', 'SGP_HVO_SAS_AC', 'SGP_HVO_SAS_AN', 'SGP_DCM_HH', 'SGP_HCM_HH', 'SGP_HVO_HH', 'RBH_DCM_AFR_AC', 'RBH_DCM_AFR_AN', 'RBH_DCM_SAS_AC', 'RBH_DCM_SAS_AN', 'RBH_DCM_NFE_AC', 'RBH_DCM_NFE_AN', 'RBH_DCM_EAS_AC', 'RBH_DCM_EAS_AN', 'RBH_DCM_OTH_AC', 'RBH_DCM_OTH_AN', 'RBH_HCM_AFR_AC', 'RBH_HCM_AFR_AN', 'RBH_HCM_SAS_AC', 'RBH_HCM_SAS_AN', 'RBH_HCM_NFE_AC', 'RBH_HCM_NFE_AN', 'RBH_HCM_EAS_AC', 'RBH_HCM_EAS_AN', 'RBH_HCM_OTH_AC', 'RBH_HCM_OTH_AN', 'RBH_HVO_AFR_AC', 'RBH_HVO_AFR_AN', 'RBH_HVO_SAS_AC', 'RBH_HVO_SAS_AN', 'RBH_HVO_NFE_AC', 'RBH_HVO_NFE_AN', 'RBH_HVO_EAS_AC', 'RBH_HVO_EAS_AN', 'RBH_HVO_OTH_AC', 'RBH_HVO_OTH_AN', 'RBH_DCM_HH', 'RBH_HCM_HH', 'RBH_HVO_HH', 'RBH_DCM_0_10_AC', 'RBH_DCM_11_20_AC', 'RBH_DCM_21_30_AC', 'RBH_DCM_31_40_AC', 'RBH_DCM_41_50_AC', 'RBH_DCM_51_60_AC', 'RBH_DCM_61_70_AC', 'RBH_DCM_71_80_AC', 'RBH_DCM_81_90_AC', 'RBH_HCM_0_10_AC', 'RBH_HCM_11_20_AC', 'RBH_HCM_21_30_AC', 'RBH_HCM_31_40_AC', 'RBH_HCM_41_50_AC', 'RBH_HCM_51_60_AC', 'RBH_HCM_61_70_AC', 'RBH_HCM_71_80_AC', 'RBH_HCM_81_90_AC', 'RBH_HVO_11_20_AC', 'RBH_HVO_21_30_AC', 'RBH_HVO_31_40_AC', 'RBH_HVO_41_50_AC', 'RBH_HVO_51_60_AC', 'RBH_HVO_61_70_AC', 'RBH_HVO_71_80_AC', 'LMM_DCM_UNK_AC', 'LMM_DCM_UNK_AN', 'LMM_HCM_UNK_AC', 'LMM_HCM_UNK_AN', 'OMG_HCM_UNK_AC', 'OMG_HCM_UNK_AN', 'OMG_DCM_UNK_AC', 'OMG_DCM_UNK_AN' ]  // eslint-disable-line
  assert.deepEqual(variantExpected, variantKeys)
  assert.end()
})

test('Get for a given disease', (assert) => {
  const grouped = processCardioVariant(data.variants.filter(v => v.variant_id === '14-23902865-G-A')[0])
  // const grouped = processCardioVariants(data.variants)
  // console.log(JSON.stringify(grouped, null, '\t'))
  const expected = {
    'variant_id': '14-23902865-G-A',
    'chrom': 'chr14',
    'ref': 'G',
    'alt': 'A',
    'rsid': 'rs186964570',
    'filter': 'PASS',
    'pos': 23902865,
    'xpos': null,
    'ENST': 'ENST00000355349',
    'Consequence': 'missense_variant',
    'SYMBOL': 'MYH7',
    'SYMBOL_SOURCE': 'HGNC',
    'ENSG': 'ENSG00000092054',
    'Feature': null,
    'BIOTYPE': 'protein_coding',
    'HGVSc': 'ENST00000355349.3:c.77C>T',
    'HGVSp': null,
    'cDNA_position': '240',
    'CDS_position': null,
    'Protein_position': null,
    'Amino_acids': null,
    'Codons': null,
    'Existing_variation': null,
    'STRAND': '-1',
    'CANONICAL': 'YES',
    'CCDS': 'CCDS9601.1',
    'ENSP': 'ENSP00000347507',
    'SIFT': null,
    'PolyPhen': null,
    'ExAC_MAF': null,
    'PUBMED': null,
    'diseases': {
      'DCM': {
        'disease_totals': {
          'allele_count': 2,
          'allele_num': 1726
        },
        'ages': [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        ],
        'cohorts': {
          'OMG': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'LMM': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {
                'pop_ac': 1,
                'pop_an': 1512,
                'pop_freq': 0.0006613756613756613
              }
            },
            'cohort_totals': {
              'allele_count': 1,
              'allele_num': 1512
            }
          },
          'SGP': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {
                'pop_ac': 1,
                'pop_an': 214,
                'pop_freq': 0.004672897196261682
              },
              'OTH': {},
              'UNK': {}
            },
            'zygosity': 0,
            'cohort_totals': {
              'allele_count': 1,
              'allele_num': 214
            }
          },
          'EGY': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'zygosity': null,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'RBH': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'zygosity': null,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          }
        }
      },
      'HCM': {
        'disease_totals': {
          'allele_count': 0,
          'allele_num': 312
        },
        'ages': [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        ],
        'cohorts': {
          'OMG': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'LMM': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'SGP': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {
                'pop_ac': 0,
                'pop_an': 312,
                'pop_freq': 0
              },
              'OTH': {},
              'UNK': {}
            },
            'zygosity': 0,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 312
            }
          },
          'EGY': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'zygosity': null,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'RBH': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'zygosity': null,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          }
        }
      },
      'HVO': {
        'disease_totals': {
          'allele_count': 3,
          'allele_num': 1492
        },
        'ages': [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        ],
        'cohorts': {
          'OMG': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'LMM': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'SGP': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {
                'pop_ac': 3,
                'pop_an': 1492,
                'pop_freq': 0.0020107238605898124
              },
              'OTH': {},
              'UNK': {}
            },
            'zygosity': 0,
            'cohort_totals': {
              'allele_count': 3,
              'allele_num': 1492
            }
          },
          'EGY': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'zygosity': null,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          },
          'RBH': {
            'populations': {
              'AFR': {},
              'ASJ': {},
              'EAS': {},
              'FIN': {},
              'NFE': {},
              'LAT': {},
              'SAS': {},
              'OTH': {},
              'UNK': {}
            },
            'zygosity': null,
            'cohort_totals': {
              'allele_count': 0,
              'allele_num': 0
            }
          }
        }
      }
    }
  }
  // assert.deepEqual(grouped[0], expected)
  assert.end()
})

test('getConsequenceBreakdown', (assert) => {
  const expected = {
    all: {
      OMG: [
        454,
        1363200
      ],
      LMM: [
        466,
        1217216
      ],
      SGP: [
        379,
        36500
      ],
      EGY: [
        0,
        0
      ],
      RBH: [
        2682,
        202430
      ]
    },
    lof: {
      OMG: [
        2,
        12800
      ],
      LMM: [
        1,
        5824
      ],
      SGP: [
        0,
        624
      ],
      EGY: [
        0,
        0
      ],
      RBH: [
        4,
        5362
      ]
    },
    missense: {
      OMG: [
        420,
        1235200
      ],
      LMM: [
        432,
        1089088
      ],
      SGP: [
        18,
        9360
      ],
      EGY: [
        0,
        0
      ],
      RBH: [
        66,
        68940
      ]
    }
  }
  const breakdown = getConsequenceBreakdown(data.variants, 'HCM')
  assert.deepEqual(expected, breakdown)
  assert.end()
})

test('sum cohorts.', (assert) => {
  const cohortBreakdowns = getConsequenceBreakdown(data.variants, 'HCM')
  const numeratorsByCategory = sumCohorts(cohortBreakdowns)
  const expected = {
    all: 0.0014120295983536606,
    lof: 0.0002844372206420154,
    missense: 0.0003895799030045934,
  }
  assert.deepEqual(expected, numeratorsByCategory)
  assert.end()
})


test('odds ratio, ef', (assert) => {
  const cohortBreakdowns = getConsequenceBreakdown(data.variants, 'HCM')
  const healthyBreakdowns = getConsequenceBreakdown(data.variants, 'HVO')
  const calculations = burdenCalculations(cohortBreakdowns, healthyBreakdowns)
  const expected = {
    missense: {
      odds_ratio: 1.35530952456268,
      ef: 0.2621611654926784
    },
    lof: {
      odds_ratio: 0.8952945956928077,
      ef: -0.11695078336328829
    },
    all: {
      odds_ratio: 0.12503734865004978,
      ef: -6.997610400383373
    }
  }

  assert.deepEqual(expected, calculations)
  // console.log(JSON.stringify(calculations, null, '\t'))
  assert.end()
})
