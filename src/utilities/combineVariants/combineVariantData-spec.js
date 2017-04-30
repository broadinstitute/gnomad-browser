/* eslint-disable no-console */
import expect from 'expect'
import R from 'ramda'
import fetch from 'isomorphic-fetch'
import config from 'config'


import {
  combineVariantData,
  combineDataForTable,
  combineDataForVariantPage,
} from './index'

// import { VARIANTS_TABLE_FIELDS } from '../../src/constants'

const API_URL = config.get('GNOMAD_API_URL')
xdescribe('combineVariantData', () => {
  const geneId = 'ENSG00000186951'
  const URL = `${API_URL}/gene/${geneId}`
  it('reduces/sums variant array from multiple data sources', (done) => {
    fetch(URL)
      .then(response => response.json())
      .then(data => {
        const { variants_in_gene } = data
        const result = combineVariantData(
          VARIANTS_TABLE_FIELDS,
          variants_in_gene,
        )
        expect(Object.keys(result).length).toBe(579)
        const variant = result['22-46594241-G-T']
        expect(
          variant.allele_num,
        ).toBe(variant.ExAC.allele_num + variant.gnomAD.allele_num)
        // console.log(result['22-46594241-G-T'])
        expect(result['22-46594241-G-T']).toEqual({
          chrom: '22',
          CANONICAL: '',
          HGVS: 'c.-39-1G>T',
          HGVSc: 'c.-39-1G>T',
          HGVSp: '',
          alt: 'T',
          category: 'lof_variant',
          flags: ['LC LoF'],
          indel: false,
          major_consequence: 'splice_acceptor_variant',
          pos: 46594241,
          ref: 'G',
          rsid: '.',
          variant_id: '22-46594241-G-T',
          ac_female: 0,
          ac_male: 2,
          allele_count: 2,
          allele_num: 240332,
          an_female: 106592,
          an_male: 133740,
          hom_count: 0,
          hemi_count: NaN,
          pop_acs: {
            African: 0,
            'East Asian': 2,
            'European (Finnish)': 0,
            'European (Non-Finnish)': 0,
            Latino: 0,
            Other: 0,
            'South Asian': 0,
          },
          pop_ans: {
            African: 20192,
            'East Asian': 17208,
            'European (Finnish)': 13212,
            'European (Non-Finnish)': 131912,
            Latino: 23068,
            Other: 1804,
            'South Asian': 32936,
          },
          pop_homs: {
            African: 0,
            'East Asian': 0,
            'European (Finnish)': 0,
            'European (Non-Finnish)': 0,
            Latino: 0,
            Other: 0,
            'South Asian': 0
          },
          allele_freq: 0.000008321821480285606,
          datasets: [
            'all', 'ExAC', 'gnomAD'
          ],
          ExAC: {
            ac_female: '0',
            ac_male: '1',
            allele_count: 1,
            allele_freq: 0.000008321821480285606,
            allele_num: 120166,
            an_female: '53296',
            an_male: '66870',
            pop_acs: {
              African: 0,
              'East Asian': 1,
              'European (Finnish)': 0,
              'European (Non-Finnish)': 0,
              Latino: 0,
              Other: 0,
              'South Asian': 0
            },
            pop_ans: {
              African: 10096,
              'East Asian': 8604,
              'European (Finnish)': 6606,
              'European (Non-Finnish)': 65956,
              Latino: 11534,
              Other: 902,
              'South Asian': 16468
            },
            pop_homs: {
              African: 0,
              'East Asian': 0,
              'European (Finnish)': 0,
              'European (Non-Finnish)': 0,
              Latino: 0,
              Other: 0,
              'South Asian': 0
            },
            filter: 'PASS',
            quality_metrics: {
              BaseQRankSum: '-7.680e+00',
              ClippingRankSum: '0.845',
              DP: '1920534',
              FS: '1.526',
              InbreedingCoeff: '0.0023',
              MQ: '59.69',
              MQRankSum: '2.36',
              QD: '13.50',
              ReadPosRankSum: '1.09',
              VQSLOD: '-6.268e-01'
            }
          },
          all: {
            ac_female: 0,
            ac_male: 2,
            allele_count: 2,
            allele_freq: 0.000008321821480285606,
            allele_num: 240332,
            an_female: 106592,
            an_male: 133740,
            pop_acs: {
              African: 0,
              'East Asian': 2,
              'European (Finnish)': 0,
              'European (Non-Finnish)': 0,
              Latino: 0,
              Other: 0,
              'South Asian': 0
            },
            pop_ans: {
              African: 20192,
              'East Asian': 17208,
              'European (Finnish)': 13212,
              'European (Non-Finnish)': 131912,
              Latino: 23068,
              Other: 1804,
              'South Asian': 32936
            },
            pop_homs: {
              African: 0,
              'East Asian': 0,
              'European (Finnish)': 0,
              'European (Non-Finnish)': 0,
              Latino: 0,
              Other: 0,
              'South Asian': 0
            },
            filter: undefined,
            quality_metrics: undefined
          },
          gnomAD: {
            ac_female: '0',
            ac_male: '1',
            allele_count: 1,
            allele_freq: 0.000008321821480285606,
            allele_num: 120166,
            an_female: '53296',
            an_male: '66870',
            pop_acs: {
              African: 0,
              'East Asian': 1,
              'European (Finnish)': 0,
              'European (Non-Finnish)': 0,
              Latino: 0,
              Other: 0,
              'South Asian': 0
            },
            pop_ans: {
              African: 10096,
              'East Asian': 8604,
              'European (Finnish)': 6606,
              'European (Non-Finnish)': 65956,
              Latino: 11534,
              Other: 902,
              'South Asian': 16468
            },
            pop_homs: {
              African: 0,
              'East Asian': 0,
              'European (Finnish)': 0,
              'European (Non-Finnish)': 0,
              Latino: 0,
              Other: 0,
              'South Asian': 0
            },
            filter: 'PASS',
            quality_metrics: {
              BaseQRankSum: '-7.680e+00',
              ClippingRankSum: '0.845',
              DP: '1920534',
              FS: '1.526',
              InbreedingCoeff: '0.0023',
              MQ: '59.69',
              MQRankSum: '2.36',
              QD: '13.50',
              ReadPosRankSum: '1.09',
              VQSLOD: '-6.268e-01'
            }
          }
        })
        done()
         // eslint-disable-next-line
      }).catch(error => console.log(error))
  })
  xit('works with variants_in_transcript', (done) => {
    fetch(URL)
      .then(response => response.json())
      .then(data => {
        const { variants_in_transcript } = data
        const result = combineVariantData(
          VARIANTS_TABLE_FIELDS,
          variants_in_transcript
        )
        expect(Object.keys(result).length).toBe(579)
        done()
         // eslint-disable-next-line
      }).catch(error => console.log(error))
  })
})

xdescribe('addQualityResults', () => {
  const geneId = 'ENSG00000186951'
  const URL = `${API_URL}/gene/${geneId}`
  it('adds flag indicating which data passes quality filter', (done) => {
    fetch(URL)
      .then(response => response.json())
      .then(data => {
        const { variants_in_gene } = data
        /**
         * add test cases where passes in 1 data set
         * but not the other
         */
        variants_in_gene.find(v =>
          v.variant_id === '22-46594290-A-G'
            && v.dataset === 'gnomAD')
        .filter = 'fail'
        variants_in_gene.find(v =>
          v.variant_id === '22-46594285-T-A'
            && v.dataset === 'ExAC')
        .filter = 'fail'
        variants_in_gene.find(v =>
          v.variant_id === '22-46594255-G-T'
            && v.dataset === 'gnomAD')
        .filter = 'fail'
        const results = combineDataForTable(variants_in_gene)
        const variantPassesExac = results.find(v => v.variant_id === '22-46594251-C-T')
        const variantPassesGnomad = results.find(v => v.variant_id === '22-46594252-G-T')
        const variantPassesMulti = results.find(v => v.variant_id === '22-46594241-G-T')
        const variantFailsExac = results.find(v => v.variant_id === '22-46611083-A-C')
        const variantFailsGnomad = results.find(v => v.variant_id === '22-46594255-G-T')
        const variantFailsMulti = results.find(v => v.variant_id === '22-46594291-C-T')
        const gnomadFailsExacPasses = results.find(v => v.variant_id === '22-46594290-A-G')
        const exacFailsGnomadPasses = results.find(v => v.variant_id === '22-46594285-T-A')
        expect(variantPassesExac.pass).toBe('all')
        expect(variantPassesGnomad.pass).toBe('all')
        expect(variantPassesMulti.pass).toBe('all')
        expect(variantFailsExac.pass).toBe('none')
        expect(variantFailsGnomad.pass).toBe('none')
        expect(variantFailsMulti.pass).toBe('none')
        expect(gnomadFailsExacPasses.pass).toBe('ExAC')
        expect(exacFailsGnomadPasses.pass).toBe('gnomAD')
        done()
      }).catch(error => console.log(error))
  })
})
xdescribe('combineDataForTable', () => {
  const geneId = 'ENSG00000186951'
  const URL = `${API_URL}/gene/${geneId}`
  it('reduces/sums duplicate variants, then combined with original variants', (done) => {
    fetch(URL)
      .then(response => response.json())
      .then(data => {
        const { variants_in_gene } = data
        const result = combineDataForTable(variants_in_gene)
        expect(result.length).toBe(579)
        done()
      }).catch(error => console.log(error))
  })
})

xdescribe('combineDataForVariantPage', () => {
  const variantId = '22-46594241-G-T'
  const URL = `${API_URL}/variant/${variantId}`
  it('reduces/sums duplicate variants', (done) => {
    fetch(URL)
      .then(response => response.json())
      .then(data => {
        // console.log(data)
        const variant = combineDataForVariantPage(
          data.exac.variant,
          data.gnomad.variant
        )
        // console.log(variant.gnomad.genotype_depths)
        done()
      }).catch(error => console.log(error))
  })
})