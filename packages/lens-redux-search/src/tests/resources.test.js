import test from 'tape'
import Immutable from 'immutable'

import createTestStore from '../example/store'
import { State, resources, resourceSelector, variants } from '../example/resources'

const store = createTestStore()

test('Check expected state', (assert) => {
  const state = store.getState()
  assert.deepEqual(Object.keys(state), ['resources', 'search'], 'Root reducer keys')
  assert.deepEqual(Object.keys(state.search.variants), ['isSearching', 'result', 'text'], 'Redux search keys')
  const expectedFirstVariant = Immutable.Map({
    "lof": null,
    "consequence": "start_lost",
    "allele_num": 166858,
    "hgvsc": "c.2T>C",
    "allele_count": 1,
    "pass": true,
    "pos": 55505512,
    "hgvsp": "p.Met1?",
    "variant_id": "1-55505512-T-C",
    "hom_count": 0,
    "allele_freq": 0.000005993119898356687,
    "filters": "PASS",
    "rsid": null,
  })
  assert.deepEqual(expectedFirstVariant, state.resources.get('variants').first(), 'Expected variant data')
  assert.end()
})
