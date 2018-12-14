import React from 'react'
import { Provider } from 'react-redux'
import { BrowserRouter as Router } from 'react-router-dom'
import { injectGlobal } from 'styled-components'

import { createGenePageStore } from '@broad/gene-page'
import { actions as userInterfaceActions } from '@broad/ui'
import { getLabelForConsequenceTerm, registerConsequences } from '@broad/utilities'

import browserConfig from '@browser/config'

import App from './routes'

// eslint-disable-next-line no-unused-expressions
injectGlobal`
  html,
  body {
    background-color: #fafafa;
    font-family: Roboto, sans-serif;
    font-size: 14px;
  }
`

document.title = browserConfig.pageTitle

registerConsequences(browserConfig.consequences)

const appSettings = {
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
  logger: true,
  docs: {
    toc: null,
    index: null,
  },
  projectDefaults: {
    startingGene: null,
    startingVariant: null,
    startingVariantDataset: 'variants',
    startingQcFilter: false,
  },
  variantDatasets: {
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
  },
}

const store = createGenePageStore(appSettings)

window.addEventListener('resize', () =>
  store.dispatch(userInterfaceActions.setScreenSize(window.innerHeight, window.innerWidth))
)

const Main = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
)

export default Main
