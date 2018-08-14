import { OrderedMap, Set } from 'immutable'

import { actions as geneActions } from './genes'
import { createTestStore } from './testStore'


test('Initial state.', () => {
  const store = createTestStore()
  const initialState = store.getState()
  expect(OrderedMap.isOrderedMap(initialState.genes.byGeneName)).toBe(true)
  expect(initialState.genes.isFetching).toBe(true)
  expect(Set.isSet(initialState.genes.allGeneNames)).toBe(true)
})

test('Receive gene data.', () => {
  const store = createTestStore()

  const geneData = {
    data: {
      gene: {
        xstop: 1055530526,
        xstart: 1055505222,
        something: 'awesome',
        gene_name: 'PCSK9',
        information: {
          hello: 'world'
        },
        transcript: {
          transcript_id: '1',
          strand: '+',
          exons: [
            {
              feature_type: 'CDS',
            }
          ]
        },
        transcripts: [
          {
            transcript_id: '1',
            strand: '+',
            exons: [
              {
                feature_type: 'CDS',
              }
            ]
          }
        ]
      }
    }
  }

  store.dispatch(geneActions.receiveGeneData('PCSK9', geneData.data.gene))
  const state = store.getState()

  expect(state.genes.byGeneName.get('PCSK9').toJS()).toMatchObject({
    gene_name: 'PCSK9',
    xstart: 1055505222,
    xstop: 1055530526,
  })
})
