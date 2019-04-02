import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { getCategoryFromConsequence } from '@broad/utilities'
import { actions as userInterfaceActions } from '@broad/ui'

import { variantfx } from './redux'
import App from './routes'
import { createVariantFXStore } from './store'

const appSettings = {
  variantMatchesConsequenceCategoryFilter(variant, selectedCategories) {
    const consequences = variant.Consequence.split('&')
    const categories = consequences.map(
      consequence => getCategoryFromConsequence(consequence) || 'other'
    )

    return categories.some(category => selectedCategories[category])
  },
  variantSearchPredicate(variant, query) {
    return (
      variant.get('variant_id').toLowerCase().includes(query)
      || (variant.get('HGVSc') || '').toLowerCase().includes(query)
      || (variant.get('Consequence') || '').toLowerCase().includes(query)
    )
  },
  docs: {
    toc: null,
    index: null,
  },
  projectDefaults: {
    startingGene: '',
    startingVariant: '',
    startingPadding: 75,
    startingVariantDataset: 'variants',
  },
  variantDatasets: {
    variants: {
      id: null,
      ENST: null,
      Consequence: null,
      SYMBOL: null,
      SYMBOL_SOURCE: null,
      ENSG: null,
      Feature: null,
      BIOTYPE: null,
      HGVSc: null,
      HGVSp: null,
      cDNA_position: null,
      CDS_position: null,
      Protein_position: null,
      Amino_acids: null,
      Codons: null,
      Existing_variation: null,
      STRAND: null,
      CANONICAL: null,
      CCDS: null,
      ENSP: null,
      SIFT: null,
      PolyPhen: null,
      ExAC_MAF: null,
      PUBMED: null,
      variant_id: null,
      chrom: null,
      ref: null,
      alt: null,
      rsid: null,
      filter: null,
      pos: null,
      DP: null,
      FS: null,
      MLEAC: null,
      MLEAF: null,
      MQ: null,
      MQ0: null,
      QD: null,
      EGY_DCM_AFR_AC: null,
      EGY_DCM_AFR_AN: null,
      EGY_HCM_AFR_AC: null,
      EGY_HCM_AFR_AN: null,
      EGY_HVO_AFR_AC: null,
      EGY_HVO_AFR_AN: null,
      EGY_DCM_HH: null,
      EGY_HCM_HH: null,
      EGY_HVO_HH: null,
      SGP_DCM_SAS_AC: null,
      SGP_DCM_SAS_AN: null,
      SGP_HCM_SAS_AC: null,
      SGP_HCM_SAS_AN: null,
      SGP_HVO_SAS_AC: null,
      SGP_HVO_SAS_AN: null,
      SGP_DCM_HH: null,
      SGP_HCM_HH: null,
      SGP_HVO_HH: null,
      RBH_DCM_AFR_AC: null,
      RBH_DCM_AFR_AN: null,
      RBH_DCM_SAS_AC: null,
      RBH_DCM_SAS_AN: null,
      RBH_DCM_NFE_AC: null,
      RBH_DCM_NFE_AN: null,
      RBH_DCM_EAS_AC: null,
      RBH_DCM_EAS_AN: null,
      RBH_DCM_OTH_AC: null,
      RBH_DCM_OTH_AN: null,
      RBH_HCM_AFR_AC: null,
      RBH_HCM_AFR_AN: null,
      RBH_HCM_SAS_AC: null,
      RBH_HCM_SAS_AN: null,
      RBH_HCM_NFE_AC: null,
      RBH_HCM_NFE_AN: null,
      RBH_HCM_EAS_AC: null,
      RBH_HCM_EAS_AN: null,
      RBH_HCM_OTH_AC: null,
      RBH_HCM_OTH_AN: null,
      RBH_HVO_AFR_AC: null,
      RBH_HVO_AFR_AN: null,
      RBH_HVO_SAS_AC: null,
      RBH_HVO_SAS_AN: null,
      RBH_HVO_NFE_AC: null,
      RBH_HVO_NFE_AN: null,
      RBH_HVO_EAS_AC: null,
      RBH_HVO_EAS_AN: null,
      RBH_HVO_OTH_AC: null,
      RBH_HVO_OTH_AN: null,
      RBH_DCM_HH: null,
      RBH_HCM_HH: null,
      RBH_HVO_HH: null,
      RBH_DCM_0_10_AC: null,
      RBH_DCM_11_20_AC: null,
      RBH_DCM_21_30_AC: null,
      RBH_DCM_31_40_AC: null,
      RBH_DCM_41_50_AC: null,
      RBH_DCM_51_60_AC: null,
      RBH_DCM_61_70_AC: null,
      RBH_DCM_71_80_AC: null,
      RBH_DCM_81_90_AC: null,
      RBH_HCM_0_10_AC: null,
      RBH_HCM_11_20_AC: null,
      RBH_HCM_21_30_AC: null,
      RBH_HCM_31_40_AC: null,
      RBH_HCM_41_50_AC: null,
      RBH_HCM_51_60_AC: null,
      RBH_HCM_61_70_AC: null,
      RBH_HCM_71_80_AC: null,
      RBH_HCM_81_90_AC: null,
      RBH_HVO_11_20_AC: null,
      RBH_HVO_21_30_AC: null,
      RBH_HVO_31_40_AC: null,
      RBH_HVO_41_50_AC: null,
      RBH_HVO_51_60_AC: null,
      RBH_HVO_61_70_AC: null,
      RBH_HVO_71_80_AC: null,
      LMM_DCM_UNK_AC: null,
      LMM_DCM_UNK_AN: null,
      LMM_HCM_UNK_AC: null,
      LMM_HCM_UNK_AN: null,
      OMG_HCM_UNK_AC: null,
      OMG_HCM_UNK_AN: null,
      OMG_DCM_UNK_AC: null,
      OMG_DCM_UNK_AN: null,
      GNO_HVO_UNK_AC: null,
      GNO_HVO_UNK_AN: null,
      GNO_HVO_UNK_AF: null,
      CTL_AC: null,
      HCM_AC: null,
      DCM_AC: null,
      HCM_AN: null,
      DCM_AN: null,
      CTL_AN: null,
      allele_freq: null,
    },
  }
}

const store = createVariantFXStore(appSettings, { variantfx })

window.addEventListener('resize', () => store.dispatch(userInterfaceActions.setScreenSize(
  window.innerHeight,
  window.innerWidth
)))


const Main = () => (
  <Provider store={store}>
    <Router>
      <Route path="/" component={App} />
    </Router>
  </Provider>
)

export default Main
