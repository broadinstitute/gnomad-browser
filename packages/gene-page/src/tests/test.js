import test from 'tape'
import { Record, OrderedMap, Set, Map, Seq } from 'immutable'
import createGenePageStore from '../store/store'
import data from '@resources/1506782078-gene-page-test-data.json'  // eslint-disable-line

import { actions } from '../resources/genes'

function log (json) {
  console.log(JSON.stringify(json, null, '  '))
}

const appSettings = {
  searchIndexes: ['variant_id'],
  variantDatasets: {
    gnomadExomeVariants: {
      variant_id: null,
      pos: null,
      xpos: null,
      allele_count: null,
      allele_freq: null,
      filter: null,
    },
    gnomadGenomeVariants: {
      variant_id: null,
      pos: null,
      xpos: null,
      allele_count: null,
      allele_freq: null,
      filter: null,
    },
  }
}

test('Initial state.', (assert) => {
  const store = createGenePageStore(appSettings)
  assert.true(OrderedMap.isOrderedMap(store.getState().genes.byGeneName), 'Gene data by name is ordered map')
  assert.false(store.getState().genes.isFetching, 'Initial gene data fetching state set to false')
  assert.true(Set.isSet(store.getState().genes.allGeneNames), 'Set of all gene names fetched')

  assert.true(OrderedMap.isOrderedMap(store.getState().variants.byVariantDataset), 'Variant datasets ordered map')
  assert.false(store.getState().variants.isFetching, 'Variants fetching state initializes false')
  assert.deepEqual(
    store.getState().variants.byVariantDataset.keySeq().toJS(),
    ['gnomadExomeVariants', 'gnomadGenomeVariants'],
    'Variant dataset keys said according to app settings'
  )
  assert.end()
})

test('Assertions with tape.', (assert) => {
  // log(Object.keys(data.data.gene))
  const store = createGenePageStore(appSettings)
  // log(store.getState().variants.byVariantDataset)
  store.dispatch(actions.receiveGeneData('ARSF', data.data.gene))
  // log(store.getState().variants.get('byVariantDataset'))
  assert.end()
})
