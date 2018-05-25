import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import {
  List,
} from 'immutable'

import { Provider } from 'react-redux'
import { ApolloClient } from 'apollo-client'
import { ApolloProvider } from 'react-apollo'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'

import createGenePageStore from '@broad/gene-page/src/store/store'
import { actions as userInterfaceActions } from '@broad/ui'
import App from './routes'

const API_URL = process.env.GNOMAD_API_URL

const consequencePresentation = {
  mis: 'missense',
  ns: 'inframe indel',
  syn: 'synonymous',
  splice: 'splice region',
  lof: 'loss of function',
}

const appSettings = {
  searchIndexes: ({ resources, indexDocument, state }) => {
    resources.forEach(variant => {
      indexDocument(variant.get('id'), variant.get('variant_id'))
      if (variant.get('hgvsc_canonical')) {
        indexDocument(variant.get('id'), variant.get('hgvsc_canonical'))
      }
      if (variant.get('hgvsp_canonical')) {
        indexDocument(variant.get('id'), variant.get('hgvsp_canonical'))
      }
      if (variant.get('consequence')) {
        indexDocument(variant.get('id'), consequencePresentation[variant.get('consequence')])
      }
    })
  },
  searchResourceSelector: (resourceName, state) => {
    return state.variants.searchIndexed
  },
  logger: true,
  docs: {
    toc: null,
    index: null,
  },
  projectDefaults: {
    startingGene: '',
    startingVariant: '',
    startingPadding: 75,
    startingVariantDataset: 'schizophreniaRareVariants',
    startingQcFilter: false,
  },
  variantDatasets: {
    schizophreniaRareVariants: {
      id: null,
      ac: null,
      ac_case: null,
      ac_ctrl: null,
      af_case: null,
      af_ctrl: null,
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
      ac_denovo: null,
      polyphen: null,
      pos: null,
      pval_meta: null,
      qp: null,
      se: null,
      source: null,
      transcript_id: null,
      variant_id: null,
      xpos: null,
      datasets: new List(['schizophreniaRareVariants']),
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

window.addEventListener('resize', () => store.dispatch(userInterfaceActions.setScreenSize(
  window.innerHeight,
  window.innerWidth
)))
console.log('API url', process.env.GNOMAD_API_URL)
const client = new ApolloClient({
  link: new HttpLink({ uri: process.env.GNOMAD_API_URL }),
  // link: new HttpLink({ uri: API_URL }),
  cache: new InMemoryCache()
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
