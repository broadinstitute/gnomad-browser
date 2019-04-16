import React from 'react'
import { Provider } from 'react-redux'
import { BrowserRouter as Router } from 'react-router-dom'
import { applyMiddleware, combineReducers, createStore } from 'redux'
import createDebounce from 'redux-debounced'
import { createLogger } from 'redux-logger'
import thunk from 'redux-thunk'
import { createGlobalStyle } from 'styled-components'

import { createVariantReducer } from '@broad/redux-variants'
import { actions as userInterfaceActions, createUserInterfaceReducer } from '@broad/ui'
import { getLabelForConsequenceTerm, registerConsequences } from '@broad/utilities'

import browserConfig from '@browser/config'

import App from './routes'

const GlobalStyles = createGlobalStyle`
  html,
  body {
    background-color: #fafafa;
    font-family: Roboto, sans-serif;
    font-size: 14px;
  }
`

document.title = browserConfig.pageTitle

const variantDatasets = {
  variants: {
    id: null,
    ac: null,
    ac_case: null,
    ac_ctrl: null,
    ac_denovo: null,
    af: null,
    allele_freq: null,
    af_case: null,
    af_ctrl: null,
    an: null,
    an_case: null,
    an_ctrl: null,
    cadd: null,
    canonical_transcript_id: null,
    chrom: null,
    comment: null,
    consequence: null,
    csq_analysis: null,
    csq_canonical: null,
    csq_worst: null,
    estimate: null,
    flags: null,
    gene_id: null,
    gene_name: null,
    hgvsc: null,
    hgvsc_canonical: null,
    hgvsp: null,
    hgvsp_canonical: null,
    i2: null,
    in_analysis: null,
    mpc: null,
    n_analysis_groups: null,
    polyphen: null,
    pos: null,
    pval_meta: null,
    qp: null,
    se: null,
    source: null,
    transcript_id: null,
    variant_id: null,
    xpos: null,
  },
}

registerConsequences(browserConfig.consequences)

const rootReducer = combineReducers({
  ui: createUserInterfaceReducer(),
  variants: createVariantReducer({
    projectDefaults: {
      startingVariant: null,
      startingVariantDataset: 'variants',
      startingIndelFilter: true,
      startingQcFilter: false,
      startingSnpFilter: true,
    },
    variantDatasets,
    variantSearchPredicate(variant, query) {
      return (
        variant
          .get('variant_id')
          .toLowerCase()
          .includes(query) ||
        (variant.get('hgvsc_canonical') || '').toLowerCase().includes(query) ||
        (variant.get('hgvsp_canonical') || '').toLowerCase().includes(query) ||
        getLabelForConsequenceTerm(variant.get('consequence') || '')
          .toLowerCase()
          .includes(query)
      )
    },
  }),
})

const store = createStore(
  rootReducer,
  undefined,
  applyMiddleware(createDebounce(), thunk, createLogger())
)

window.addEventListener('resize', () =>
  store.dispatch(userInterfaceActions.setScreenSize(window.innerHeight, window.innerWidth))
)

const Main = () => (
  <React.Fragment>
    <GlobalStyles />
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </React.Fragment>
)

export default Main
