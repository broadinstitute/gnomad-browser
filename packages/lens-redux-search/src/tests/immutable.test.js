// @flow

/**
 * Trying out immutable.js library
 */

import test from 'tape'
import { Map, List, OrderedMap } from 'immutable'

const hello: number = 'cat'

test('Immutable data structure has no side effects', (assert) => {
  const mutableState = ['apple', 'orange', 'strawberry']
  mutableState[0] = 'peach'

  assert.equal(mutableState[0], 'peach',
    'regular js arrays can be mutated')

  const immutableState = List(['apple', 'orange', 'strawberry'])
  const immutableState2 = immutableState.set(0, 'peach')

  assert.equal(immutableState.get(0), 'apple',
    'original list is the same')

  assert.equal(immutableState2.get(0), 'peach',
    'new list is updated')

  assert.end()
})

test('Immutable map', (assert) => {
  const myMap = Map({ a: 1, b: 2, c: 3 })
  const actual = myMap.get('b')
  const expected = 2
  assert.equal(actual, expected, 'gets values.')
  assert.end()
})

test('Create a map from an array of tuples', (assert) => {
  let map = Map([['todo1', { title: 'todo 1' }]])
  assert.equal(map.get('todo1').title, 'todo 1',
    'get correct item from map')

  assert.equal(map.size, 1,
    'Get size of map')
  assert.end()
})

test('crud', (assert) => {
  const myMap = Map({ a: 1, b: 2, c: 3 })
  assert.deepEqual(myMap.delete('b').toJS(), { a: 1, c: 3 })
  assert.deepEqual(myMap.update('b', item => item + 3).toJS(), { a: 1, b: 5, c: 3 })
  assert.deepEqual(myMap.clear().size, 0)
  assert.deepEqual(myMap.clear().toJS(), {})
  assert.deepEqual(myMap.merge({ d: 7, e: 8 }).toJS(), { a: 1, b: 2, c: 3, d: 7, e: 8 })
  assert.end()
})

test('Query an unordered immutable map', (assert) => {
  const myMap = Map({ a: 1, b: 2, c: 3, d: 3 })
  assert.equal(myMap.get('b'), 2)
  assert.equal(myMap.has('b'), true)
  assert.equal(myMap.has('z'), false)
  assert.equal(myMap.includes(3), true)
  assert.equal(myMap.includes(5), false)
  assert.equal(myMap.first(), 1)

  const nestedMap = Map({
    map1: Map({ a: 1, b: 2, c: 3 }),
    map2: Map({ d: 7, e: 8 }),
  })
  assert.equal(nestedMap.getIn(['map1', 'c']), 3)
  assert.equal(nestedMap.getIn(['map1', 'z'], 'not found!'), 'not found!', 'default value if not found')
  assert.equal(myMap.find((v, k) => k === 'b'), 2)
  assert.equal(myMap.find((v, k) => v === 3), 3)
  assert.deepEqual(myMap.findEntry((v, k) => v === 3), ['c', 3])
  assert.deepEqual(myMap.findLastEntry((v, k) => v === 3), ['d', 3])
  assert.end()
})

test('Iterating over immutable map', (assert) => {
  const myMap = Map({ a: 1, b: 2, c: 3, d: 3 })

  assert.deepEqual(
    myMap.map((v, k) => `${v}-${k}`).toJS(),
    { a: '1-a', b: '2-b', c: '3-c', d: '3-d' }
  )

  assert.deepEqual(
    myMap.filter((v, k) => v === 3),
    Map({ c: 3, d: 3 })
  )

  myMap.forEach((item, key) => {})

  assert.deepEqual(
    myMap.groupBy((v, k) => v >= 3),
    Map([
      [false, Map({ a: 1, b: 2 })],
      [true, Map({ c: 3, d: 3 })],
    ])
  )

  const listOfMaps = List([
    Map({ v: 0 }),
    Map({ v: 1 }),
    Map({ v: 1 }),
    Map({ v: 0 }),
    Map({ v: 2 })
  ])
  const groupsOfMaps = listOfMaps.groupBy(item => item.get('v'))
  assert.deepEqual(
    groupsOfMaps,
    OrderedMap([
      [0, List([Map({ "v": 0 }), Map({ "v": 0 })])],
      [1, List([Map({ "v": 1 }), Map({ "v": 1 })])],
      [2, List([Map({ "v": 2 })])],
    ])
  )
  assert.deepEqual(
    groupsOfMaps.get(1),
      List([Map({ "v": 1 }), Map({ "v": 1 })]),
  )


  assert.end()
})


