import { OrderedMap, Set } from 'immutable'

import * as fromGenes from '@broad/redux-genes'
import * as fromVariants from '@broad/redux-variants'
import data from '@resources/1506782078-gene-page-test-data.json'

import createGenePageStore from '../store/store'


const sum = (oldValue, newValue) => oldValue + newValue
const concat = (oldValue, newValue) => oldValue.concat(newValue)

const appSettings = {
  variantSearchPredicate(variant, query) {
    return variant.get('variant_id').toLowerCase().includes(query)
  },
  docs: {
    toc: {},
    index: null,
  },
  variantSearchFields: ['variant_id'],
  logger: false,
  projectDefaults: {
    startingGene: 'ARSF',
    startingVariant: '',
    startingPadding: 75,
    startingVariantDataset: 'gnomadCombinedVariants',
  },
  variantDatasets: {
    gnomadExomeVariants: {
      id: null,
      datasets: null,
      variant_id: null,
      pos: null,
      xpos: null,
      allele_count: null,
      allele_freq: null,
      filter: null,
    },
    gnomadGenomeVariants: {
      id: null,
      datasets: null,
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
        datasets: concat,
      }
    }
  }
}

test('Initial state.', () => {
  const store = createGenePageStore(appSettings)
  const initialState = store.getState()
  expect(OrderedMap.isOrderedMap(initialState.genes.byGeneName)).toBe(true)
  expect(initialState.genes.isFetching).toBe(true)
  expect(Set.isSet(initialState.genes.allGeneNames)).toBe(true)

  expect(OrderedMap.isOrderedMap(initialState.variants.byVariantDataset)).toBe(true)
  expect(initialState.variants.byVariantDataset.keySeq().toJS()).toEqual([
    'gnomadExomeVariants', 'gnomadGenomeVariants', 'gnomadCombinedVariants',
  ])
})

test('Receive initial gene data/variants.', () => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()
  expect(state.genes.byGeneName.get('ARSF').keySeq().toJS()).toEqual(['gene_name', 'xstart', 'xstop'])
  const exomeVariants = state.variants.getIn(['byVariantDataset', 'gnomadExomeVariants'])
  const genomeVariants = state.variants.getIn(['byVariantDataset', 'gnomadGenomeVariants'])
  expect(exomeVariants.size).toBe(691)
  expect(genomeVariants.size).toBe(193)
  expect(Object.keys(exomeVariants.first().toJS())).toEqual(
    Object.keys(appSettings.variantDatasets.gnomadExomeVariants)
  )
})

test('Combine variant datasets.', () => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()

  const combinedVariants = state.variants.getIn(['byVariantDataset', 'gnomadCombinedVariants'])

  expect(combinedVariants.size).toBe(720)
  expect(combinedVariants.toList().get(3).get('datasets').toJS()).toEqual(['gnomadExomeVariants', 'gnomadGenomeVariants'])
})

test('Variant dataset switch + variant selectors', () => {
  const store = createGenePageStore(appSettings)
  store.dispatch(fromGenes.actions.receiveGeneData('ARSF', data.data.gene))
  const state = store.getState()

  const combinedVariants = fromVariants.finalFilteredVariants(state)
  expect(combinedVariants.size).toBe(720)

  store.dispatch(fromVariants.actions.setSelectedVariantDataset('gnomadGenomeVariants'))
  const state2 = store.getState()
  const genomeVariants = fromVariants.finalFilteredVariants(state2)
  expect(genomeVariants.size).toBe(193)
})
