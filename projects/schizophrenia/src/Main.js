import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import createGenePageStore from '@broad/gene-page/src/store/store'
import { actions as activeActions } from '@broad/gene-page/src/resources/active'

import App from './routes'

const appSettings = {
  searchIndexes: ['variant_id', 'rsid', 'consequence'],
  searchResourceSelector: (resourceName, state) => {
    return state.variants.searchIndexed
  },
  logger: true,
  projectDefaults: {
    startingGene: '',
    startingVariant: '',
    startingPadding: 75,
    startingVariantDataset: 'schizophreniaExomeVariants',
    startingQcFilter: false,
  },
  variantDatasets: {
    schizophreniaExomeVariants: {
      id: null,
      chrom: null,
      pos: null,
      xpos: null,
      ref: null,
      alt: null,
      rsid: null,
      variant_id: null,
      consequence: null,
      AC: null,
      AF: null,
      AC_cases: null,
      AC_ctrls: null,
      AC_UK_cases: null,
      AC_UK_ctrls: null,
      AC_FIN_cases: null,
      AC_FIN_ctrls: null,
      AC_SWE_cases: null,
      AC_SWE_ctrls: null,
    },
    schizophreniaGwasVariants: {
      id: null,
      variant_id: null,
      chr: null,
      pos: null,
      xpos: null,
      ref: null,
      alt: null,
      n_study: null,
      study: null,
      p_value: null,
      scz_af: null,
      hc_af: null,
      odds_ratio: null,
      se: null,
      qp: null,
      i_squared: null,
      mhtp: null,
      comment: null,
      '-log10p': null,
    },
  },
  // combinedDatasets: {
  //   schizophreniaCombinedVariants: {
  //     sources: ['schizophreniaExomeVariants', 'schizophreniaGwas'],
  //     combineKeys: {}
  //   }
  // }
}

const store = createGenePageStore(appSettings)

window.addEventListener('resize', () => store.dispatch(activeActions.setScreenSize(
  window.innerHeight,
  window.innerWidth
)))

const Main = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
)

export default Main
