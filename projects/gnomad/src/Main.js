import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { Provider } from 'react-redux'

import { createGenePageStore } from '@broad/gene-page'
import { actions as userInterfaceActions } from '@broad/ui'

import App from './routes'

import toc from './toc.json'

const sum = (oldValue, newValue) => oldValue + newValue
const concat = (oldValue, newValue) => oldValue.concat(newValue)


const consequenceLabels = {
  mis: 'missense',
  missense_variant: 'missense',
  ns: 'inframe indel',
  inframe_insertion: 'inframe insertion',
  inframe_deletion: 'inframe deletion',
  syn: 'synonymous',
  synonymous_variant: 'synonymous',
  upstream_gene_variant: 'upstream gene',
  downstream_gene_variant: 'downstream gene',
  intron_variant: 'intron',
  '3_prime_UTR_variant': "3' UTR",
  '5_prime_UTR_variant': "5' UTR",
  splice: 'splice region',
  splice_region_variant: 'splice region',
  splice_donor_variant: 'splice donor',
  splice_acceptor_variant: 'splice acceptor',
  frameshift_variant: 'frameshift',
  stop_gained: 'stop gained',
  stop_lost: 'stop lost',
  start_lost: 'start lost',
  lof: 'loss of function',
}


const appSettings = {
  variantSearchPredicate(variant, query) {
    const consequence = consequenceLabels[variant.get('consequence')] || ''
    return (
      variant.get('variant_id').toLowerCase().includes(query)
      || (variant.get('rsid') || '').toLowerCase().includes(query)
      || consequence.toLowerCase().includes(query)
      || (variant.get('hgvsp') || '').toLowerCase().includes(query)
      || (variant.get('hgvsc') || '').toLowerCase().includes(query)
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
      hemi_count: null,
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
      hemi_count: null,
      consequence: null,
      lof: null,
      lcr: null,
      segdup: null,
      datasets: [],
    },
    exacVariants: {
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
      hemi_count: null,
      consequence: null,
      lof: null,
      lcr: null,
      segdup: null,
      datasets: [],
    },
  },
  combinedDatasets: {
    gnomadCombinedVariants: {
      sources: ['gnomadExomeVariants', 'gnomadGenomeVariants'],
      combineKeys: {
        allele_count: sum,
        allele_num: sum,
        hom_count: sum,
        hemi_count: sum,
        filters: concat,
        // allele_freq: () => null,
        datasets: [],
      }
    }
  }
}

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
