import test from 'tape'  // eslint-disable-line
import { Record, OrderedMap, Set, Map, Seq, List } from 'immutable'  // eslint-disable-line
import createGenePageStore from '../store/store'
import data from '@resources/1506782078-gene-page-test-data.json'  // eslint-disable-line

import * as fromGenes from '../resources/genes'
import * as fromVariants from '../resources/variants'
import * as fromActive from '../resources/active'

function log (json) {
  console.log(JSON.stringify(json, null, '  '))
}
const sum = (oldValue, newValue) => oldValue + newValue
const concat = (oldValue, newValue) => oldValue.concat(newValue)

const appSettings = {
  searchIndexes: ['variant_id'],
  logger: false,
  projectDefaults: {
    startingGene: 'ARSF',
    startingVariant: '',
    startingPadding: 75,
    startingVariantDataset: 'gnomadCombinedVariants',
  },
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
  },
  combinedDatasets: {
    gnomadCombinedVariants: {
      sources: ['gnomadExomeVariants', 'gnomadGenomeVariants'],
      combineKeys: {
        variant_id: sum,
        xpos: sum,
        allele_count: sum,
        filter: concat,
        allele_freq: () => null,
        datasets: [],
      }
    }
  }
}

test('Initial state.', (assert) => {
  const store = createGenePageStore(appSettings)
  const initialState = store.getState()
  assert.true(OrderedMap.isOrderedMap(initialState.genes.byGeneName), 'Gene data by name is ordered map')
  assert.false(initialState.genes.isFetching, 'Initial gene data fetching state set to false')
  assert.true(Set.isSet(initialState.genes.allGeneNames), 'Set of all gene names fetched')

  assert.true(OrderedMap.isOrderedMap(initialState.variants.byVariantDataset), 'Variant datasets ordered map')
  assert.false(initialState.variants.isFetching, 'Variants fetching state initializes false')
  assert.deepEqual(
    initialState.variants.byVariantDataset.keySeq().toJS(),
    ['gnomadExomeVariants', 'gnomadGenomeVariants', 'gnomadCombinedVariants'],
    'Variant dataset keys set according to app settings'
  )
  assert.end()
})

test('Receive initial gene data/variants.', (assert) => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()
  assert.deepEqual(
    state.genes.byGeneName.get('ARSF').keySeq().toJS(),
    ['gene_name', 'xstart', 'xstop'],
    'Expected gene fields set'
  )
  const exomeVariants = state.variants.getIn(['byVariantDataset', 'gnomadExomeVariants'])
  const genomeVariants = state.variants.getIn(['byVariantDataset', 'gnomadGenomeVariants'])
  assert.equal(exomeVariants.size, 691, 'data set 1 is expected size')
  assert.equal(genomeVariants.size, 193, 'data set 2 is expected size')
  assert.deepEqual(
    exomeVariants.first().keySeq().toJS(),
    [...Object.keys(appSettings.variantDatasets.gnomadExomeVariants), 'id', 'datasets'],
    'A variant has expected keys and id added'
  )
  assert.end()
})

test('Combine variant datasets.', (assert) => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()

  const combinedVariants = state.variants.getIn(['byVariantDataset', 'gnomadCombinedVariants'])

  assert.equal(combinedVariants.size, 720, 'combined data set is expected size')
  assert.deepEqual(
    combinedVariants.first().get('datasets').toJS(),
    ['gnomadExomeVariants', 'gnomadGenomeVariants'],
    'entry has appropriate source keys'
  )

  assert.end()
})

test('Variant dataset switch + variant selectors', (assert) => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()

  const combinedVariants = fromVariants.allVariantsInCurrentDatasetAsList(state)
  assert.equal(combinedVariants.size, 720, 'selector gets data given state, using default variant dataset')

  store.dispatch(fromActive.actions.setCurrentVariantDataset('gnomadGenomeVariants'))
  const state2 = store.getState()
  const genomeVariants = fromVariants.allVariantsInCurrentDatasetAsList(state2)
  assert.equal(genomeVariants.size, 193, 'action correctly changes active variant dataset')
  assert.end()
})

test.only('Variant search', (assert) => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()

  const variants = fromVariants.visibleVariantsById(state)
  assert.equal(variants.size, 720, 'all variants by default')
  store.dispatch(fromVariants.actions.setVariantFilter('rare'))
  const state2 = store.getState()
  const variants2 = fromVariants.visibleVariantsById(state2)
  assert.equal(variants2.size, 402, 'filter variants by something')

  assert.equal(fromVariants.variantSortKey(state2), 'pos')
  assert.true(fromVariants.variantSortAscending(state2))
  assert.equal(variants2.first().get('pos'), 2976602, 'initial sort (position)')

  store.dispatch(fromVariants.actions.setVariantSort('pos'))
  const state3 = store.getState()
  assert.equal(fromVariants.variantSortKey(state3), 'pos')
  assert.false(fromVariants.variantSortAscending(state3))
  const variants3 = fromVariants.visibleVariantsById(state3)
  assert.equal(variants3.first().get('pos'), 3030635, 'toggle sort (position)')

  assert.end()
})

// test('Variant search', (assert) => {
//   const store = createGenePageStore(appSettings)
//   store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
//   const state = store.getState()
//
//   const searchResults = fromVariants.variantSearchResults(state)
//   // log(searchResults(state))
//
//   assert.end()
// })
