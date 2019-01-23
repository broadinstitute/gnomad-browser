import React from 'react'
import styled from 'styled-components'
import { Provider } from 'react-redux'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { createLogger } from 'redux-logger'

import createVariantReducer from '@broad/redux-variants'
import createActiveReducer from '@broad/gene-page/src/resources/active'

import { VariantTable } from '../index'
import { fetchVariantsByGene } from './fetch'
import tableConfig from './tableConfig'

const Wrapper = styled.div`
  padding-left: 50px;
  padding-top: 50px;
  border: 1px solid #000;
`

const logger = createLogger()

const sum = (oldValue, newValue) => oldValue + newValue
const concat = (oldValue, newValue) => oldValue.concat(newValue)

const appSettings = {
  variantSearchPredicate(variant, query) {
    return (
      variant.get('variant_id').toLowerCase().includes(query)
      || variant.get('rsid').toLowerCase().includes(query)
      || variant.get('consequence').toLowerCase().includes(query)
      || variant.get('hgvsp').toLowerCase().includes(query)
      || variant.get('hgvsc').toLowerCase().includes(query)
    )
  },
  logger: true,
  projectDefaults: {
    startingGene: '',
    startingVariant: '13-32900634-AG-A',
    startingRegion: '1-55530000-55540000',
    startingPadding: 75,
    startingVariantDataset: 'gnomadCombinedVariants',
    startingIndelFilter: false,
    startingQcFilter: true,
    startingSnpFilter: false,
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

const store = createStore(
  combineReducers({
    variants: createVariantReducer(appSettings),
    active: createActiveReducer(appSettings),
  }),
  applyMiddleware(thunk, logger)
)

const ExampleApp = () => (
  <Provider store={store}>
    <Wrapper>
      <VariantTable
        tableConfig={tableConfig}
        fetchFunction={fetchVariantsByGene}
        currentGene={'DMD'}
      />
    </Wrapper>
  </Provider>
)

export default ExampleApp
