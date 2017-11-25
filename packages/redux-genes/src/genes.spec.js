import test from 'tape'  // eslint-disable-line
import { Record, OrderedMap, Set, Map, Seq, List } from 'immutable'  // eslint-disable-line

import { createTestStore } from './testStore'

import { actions as geneActions } from './index'

test('Initial state.', (assert) => {
  const store = createTestStore()
  const initialState = store.getState()
  assert.true(OrderedMap.isOrderedMap(initialState.genes.byGeneName), 'Gene data by name is ordered map')
  assert.false(initialState.genes.isFetching, 'Initial gene data fetching state set to false')
  assert.true(Set.isSet(initialState.genes.allGeneNames), 'Set of all gene names fetched')
  assert.end()
})

test.only('Receive gene data.', (assert) => {
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
  console.log(store.getState())
  store.dispatch(geneActions.receiveGeneData('PCSK9', geneData.data.gene))
  const state = store.getState()
  // assert.deepEqual(
  //   state.genes.byGeneName.get('PCSK9').keySeq().toJS(),
  //   ['xstop', 'xstart', 'gene_name'],
  //   'Expected gene fields set'
  // )
  console.log(state.genes.byGeneName.get('PCSK9'))
  assert.end()
})

// test('Set current gene.', (assert) => {
//   const store = createTestStore()
//
//   const state = store.getState()
//   assert.deepEqual(
//     state.genes.byGeneName.get('PCSK9').keySeq().toJS(),
//     ['xstop', 'xstart', 'gene_name'],
//     'Expected gene fields set'
//   )
//   assert.end()
// })
