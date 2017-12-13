import React from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import createGenePageStore from '@broad/gene-page/src/store/store'
import { actions as userInterfaceActions } from '@broad/ui'
import App from './routes'

const appSettings = {
  searchIndexes: ['variant_id', 'rsid', 'consequence'],
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
      chrom: null,
      variant_id: null,
      X: null,
      basic_gene_id: null,
      pos: null,
      MPC: null,
      xpos: null,
      basic_polyphen: null,
      affected: null,
      basic_csq: null,
      nonpsych_gnomad_AC: null,
      canonical_polyphen: null,
      canonical_csq: null,
      canonical_gene_id: null,
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

const Main = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
)

export default Main
