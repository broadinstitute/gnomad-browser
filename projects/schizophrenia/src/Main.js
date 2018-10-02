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
import { getLabelForConsequenceTerm, registerConsequences } from '@broad/utilities'
import App from './routes'

const API_URL = process.env.GNOMAD_API_URL

registerConsequences([
  {
    term: 'lof',
    label: 'loss of function',
    category: 'lof',
  },
  {
    term: 'mis',
    label: 'missense',
    category: 'missense',
  },
  {
    term: 'ns',
    label: 'inframe indel',
    category: 'missense',
  },
  {
    term: 'syn',
    label: 'synonymous',
    category: 'synonymous',
  },
  {
    term: 'splice',
    label: 'splice region',
    category: 'other',
  },
])

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
    startingGene: '',
    startingVariant: null,
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
  },
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
