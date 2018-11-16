import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import React from 'react'
import { ApolloProvider } from 'react-apollo'
import { Provider } from 'react-redux'
import { BrowserRouter as Router } from 'react-router-dom'

import createGenePageStore from '@broad/gene-page/src/store/store'
import { actions as userInterfaceActions } from '@broad/ui'
import { getLabelForConsequenceTerm, registerConsequences } from '@broad/utilities'

import App from './routes'

registerConsequences(BROWSER_CONFIG.consequences)

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
      af_case: null,
      af_ctrl: null,
      ac_denovo: null,
      allele_freq: null,
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

const client = new ApolloClient({
  link: new HttpLink({ uri: '/api' }),
  cache: new InMemoryCache(),
})

const Main = () => (
  <Provider store={store}>
    <ApolloProvider client={client}>
      <Router>
        <App />
      </Router>
    </ApolloProvider>
  </Provider>
)

export default Main
