import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider } from 'react-redux'

import { createGenePageStore } from '@broad/gene-page'
import { actions as userInterfaceActions } from '@broad/ui'
import { getLabelForConsequenceTerm } from '@broad/utilities'

import App from './routes'

import toc from './toc.json'

const appSettings = {
  variantSearchPredicate(variant, query) {
    return (
      variant
        .get('variant_id')
        .toLowerCase()
        .includes(query) ||
      (variant.get('rsid') || '').toLowerCase().includes(query) ||
      getLabelForConsequenceTerm(variant.get('consequence'))
        .toLowerCase()
        .includes(query) ||
      (variant.get('hgvsp') || '').toLowerCase().includes(query) ||
      (variant.get('hgvsc') || '').toLowerCase().includes(query)
    )
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
    startingQcFilter: true,
  },
  variantDatasets: {},
}

const variantDatasets = [
  'exac',
  'gnomad_r2_0_2',
  'gnomad_r2_1',
  'gnomad_r2_1_controls',
  'gnomad_r2_1_non_cancer',
  'gnomad_r2_1_non_neuro',
  'gnomad_r2_1_non_topmed',
]
variantDatasets.forEach(datasetId => {
  appSettings.variantDatasets[datasetId] = {
    allele_count: null,
    allele_freq: null,
    allele_num: null,
    consequence: null,
    datasets: [],
    filters: [],
    flags: [],
    hemi_count: null,
    hgvsc: null,
    hgvsp: null,
    hom_count: null,
    id: null,
    variant_id: null,
    rsid: null,
    pos: null,
    xpos: null,
  }
})

const store = createGenePageStore(appSettings)

window.addEventListener('resize', () => store.dispatch(
  userInterfaceActions.setScreenSize(
    window.innerHeight,
    window.innerWidth)
))

const Main = () => (
  <Provider store={store}>
    <Router>
      <App />
    </Router>
  </Provider>
)

export default Main
