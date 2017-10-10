import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider } from 'react-redux'

import createGenePageStore from '@broad/gene-page/src/store/store'

import App from './routes'

const sum = (oldValue, newValue) => oldValue + newValue
const concat = (oldValue, newValue) => oldValue.concat(newValue)

const appSettings = {
  searchIndexes: ['variant_id', 'rsid', 'consequence', 'hgvsp', 'hgvsc'],
  searchResourceSelector: (resourceName, state) => {
    return state.variants.byVariantDataset.get('gnomadCombinedVariants')
  },
  logger: true,
  projectDefaults: {
    startingGene: 'TP53',
    startingVariant: '13-32900634-AG-A',
    startingRegion: '1-55530000-55540000',
    startingPadding: 75,
    startingVariantDataset: 'gnomadCombinedVariants',
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
      datasets: [],
    },
    exacVariants: {
      allele_count: null,
      allele_freq: null,
      allele_num: null,
      chrom: null,
      filters: null,
      hom_count: null,
      pos: null,
      ref: null,
      rsid: null,
      variant_id: null,
      xpos: null,
      xstart: null,
      xstop: null,
      consequence: null,
      lof: null,
      datasets: [],
    }
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


const Main = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
)

export default Main
