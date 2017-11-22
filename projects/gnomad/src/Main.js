import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider } from 'react-redux'

import createGenePageStore from '@broad/gene-page/src/store/store'
import { actions as activeActions } from '@broad/gene-page/src/resources/active'

import App from './routes'

import toc from '../gnomad-docs/toc.json'

const sum = (oldValue, newValue) => oldValue + newValue
const concat = (oldValue, newValue) => oldValue.concat(newValue)

const appSettings = {
  searchIndexes: ['variant_id', 'rsid', 'consequence', 'hgvsp', 'hgvsc'],
  searchResourceSelector: (resourceName, state) => {
    return state.variants.searchIndexed
  },
  logger: true,
  docs: {
    toc: toc.toc,
    index: 'gnomad_help',
  },
  projectDefaults: {
    startingGene: '',
    startingVariant: '13-32900634-AG-A',
    startingRegion: '1-55530000-55540000',
    startingPadding: 75,
    startingVariantDataset: 'gnomadCombinedVariants',
    startingQcFilter: true,
  },
  variantDatasets: {
    gnomadExomeVariants: {
      id: null,
      variant_id: null,
      rsid: null,
      pos: null,
      xpos: null,
      hgvsc: null,
      hgvsp: null,
      allele_count: null,
      allele_freq: null,
      allele_num: null,
      filters: null,
      hom_count: null,
      consequence: null,
      lof: null,
      lcr: null,
      segdup: null,
      datasets: [],
    },
    gnomadGenomeVariants: {
      id: null,
      variant_id: null,
      rsid: null,
      pos: null,
      xpos: null,
      hgvsc: null,
      hgvsp: null,
      allele_count: null,
      allele_freq: null,
      allele_num: null,
      filters: null,
      hom_count: null,
      consequence: null,
      lof: null,
      lcr: null,
      segdup: null,
      datasets: [],
    },
    // exacVariants: {
    //   id: null,
    //   variant_id: null,
    //   rsid: null,
    //   pos: null,
    //   xpos: null,
    //   hgvsc: null,
    //   hgvsp: null,
    //   allele_count: null,
    //   allele_freq: null,
    //   allele_num: null,
    //   filters: null,
    //   hom_count: null,
    //   consequence: null,
    //   lof: null,
    //   lcr: null,
    //   segdup: null,
    //   datasets: [],
    // },
  },
  combinedDatasets: {
    gnomadCombinedVariants: {
      sources: ['gnomadExomeVariants', 'gnomadGenomeVariants'],
      combineKeys: {
        allele_count: sum,
        allele_num: sum,
        hom_count: sum,
        filter: concat,
        // allele_freq: () => null,
        datasets: [],
      }
    }
  }
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
