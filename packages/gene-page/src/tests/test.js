import test from 'tape'
import { Record, OrderedMap, Set, Map } from 'immutable'
import createGenePageStore from '../store/store'
import data from '@resources/1506655808-gene-page-test-data.json'  // eslint-disable-line

import { actions } from '../resources/genes'

function log (json) {
  console.log(JSON.stringify(json, null, '  '))
}

const genePageSettings = {
  searchIndexes: ['variant_id'],
  variantSchema: {
    variant_id: null,
    pos: null,
    xpos: null,
    allele_count: null,
    allele_freq: null,
    filter: null,
  }
}

test('Initial state.', (assert) => {
  const store = createGenePageStore(genePageSettings)
  const InitialGeneState = Record({
    isFetching: false,
    byGeneName: OrderedMap(),
    allGeneNames: Set(),
  })
  assert.deepEqual(new InitialGeneState(), store.getState().genes)

  const InitialVariantState = Record({
    isFetching: false,
    byVariantDataSet: {
      variants: Map(),
    }
  })
  assert.deepEqual(new InitialVariantState(), store.getState().variants)

  // store.dispatch(actions.receiveGeneData('ARSF', data.data.gene))
  // log(store.getState())
  assert.end()
})
