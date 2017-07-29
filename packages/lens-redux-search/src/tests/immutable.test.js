// @flow

/**
 * Trying out immutable.js library
 */

import test from 'tape'
import Immutable, { Map, List, OrderedMap } from 'immutable'

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
})>

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
      [0, List([Map({ 'v': 0 }), Map({ 'v': 0 })])],
      [1, List([Map({ 'v': 1 }), Map({ 'v': 1 })])],
      [2, List([Map({ 'v': 2 })])],
    ])
  )
  assert.deepEqual(
    groupsOfMaps.get(1),
      List([Map({ 'v': 1 }), Map({ 'v': 1 })]),
  )

  assert.end()
})

test('Working with subsets of a map', (assert) => {
  const myMap = Map({ a: 1, b: 2, c: 3, d: 3 })
  assert.deepEqual(myMap.slice(0, 2), Map({ a: 1, b: 2 }))
  assert.deepEqual(myMap.slice(myMap.size - 1, myMap.size), Map({ d: 3 }))
  assert.deepEqual(myMap.takeLast(2), Map({ c: 3, d: 3 }))
  assert.deepEqual(myMap.rest(), Map({ b: 2, c: 3, d: 3 }), 'rest similar to tail')
  assert.deepEqual(myMap.skip(2), Map({ c: 3, d: 3 }))
  assert.deepEqual(myMap.skipUntil(item => item === 2), Map({ b: 2, c: 3, d: 3 }))
  // assert.deepEqual(myMap.skipWhile(item => item === 3), Map({ a: 1 }))
  assert.end()
})

test('Equality checking', (assert) => {
  const map1 = Map({ a: 1, b: 1, c: List.of(1) })
  const map2 = Map({ a: 1, b: 1, c: List.of(1) })
  assert.notEqual(map1, map2, 'references not equal')
  assert.true(Immutable.is(map1, map2), 'immutable equality method')
  assert.end()
})

test('Equality checking subsets', (assert) => {
  const map1 = Map({ a: 1, b: 1 })
  const map2 = Map({ a: 1, b: 1, c: List.of(1) })
  assert.true(map1.isSubset(map2))
  assert.false(map2.isSubset(map1))
  assert.end()
})

test('Equality checking superset', (assert) => {
  const map1 = Map({ a: 1, b: 1 })
  const map2 = Map({ a: 1, b: 1, c: List.of(1) })
  assert.false(map1.isSuperset(map2), 'superset is the opposite of subset')
  assert.true(map2.isSuperset(map1), 'superset (more keys) is the opposite of subset')
  assert.end()
})

test('Converting javascript objects into immutable data', (assert) => {
  const plainObject = {
    fruits: ['apple', 'strawberry', 'banana', ['blueberries', 'raspberries']],
    status: true,
    number: 37,
    data: { name: 'Jefferson', occupation: 'Airplane' }
  }
  const immutableObject = Immutable.fromJS(plainObject)
  assert.true(Immutable.Map.isMap(immutableObject))
  assert.equal(immutableObject.getIn(['data', 'occupation']), 'Airplane')
  const fruitList = immutableObject.get('fruits')
  assert.true(Immutable.List.isList(fruitList))
  assert.equal(fruitList.getIn([3, 1]), 'raspberries')
  assert.end()
})

test('convert array to map using reviver function', (assert) => {
  const plainArray = ['apple', 'strawberry', 'banana', ['blueberries', 'raspberries']]
  const immutableMap = Immutable.fromJS(plainArray, (key, value) => value.toMap())
  // console.log(immutableMap)
  assert.true(Immutable.Map.isMap(immutableMap))
  assert.equal(immutableMap.getIn([3, 1]), 'raspberries')
  assert.end()
})

test('difference between immutable map and the list', (assert) => {
  const emptyList = Immutable.List()
  const listWithItem = emptyList.push('apple')
  assert.equal(listWithItem.get(0), 'apple')
  assert.end()
})

test('Instantiate list without bracket operator', (assert) => {
  const fruits = Immutable.List.of('apple', 'strawberry', 'banana')
  assert.equal(fruits.get(1), 'strawberry')
  assert.end()
})

test('Instantiate list with rest operator', (assert) => {
  const myFruits = ['apple', 'strawberry', 'banana']
  const fruits = Immutable.List.of(...myFruits)
  assert.equal(fruits.get(1), 'strawberry')
  assert.end()
})

test('Seq acts like iterable', (assert) => {
  const numberRange = Immutable.Range(0, 1000).toArray()
  const sequence = Immutable.Seq.of(...numberRange)
  assert.equal(sequence.get(0), 0)
  assert.equal(sequence.last(), 999)
  assert.end()
})

test('Seq is lazy', (assert) => {
  const numberRange = Immutable.Range(0, 1000).toArray()
  let numberOfOperations = 0

  const powerOfTwo = Immutable.Seq.of(...numberRange)
    .map(number => { numberOfOperations++; return number * 2 })

  assert.equal(numberOfOperations, 0, 'not evaluated yet unless you operate on seq')
  powerOfTwo.take(10).toArray()
  assert.equal(numberOfOperations, 10, 'after cache array, operations now 10')
  assert.end()
})

test('Should not produce an overflow with infinite range', (assert) => {
  const powerOfTwoRange =  Immutable.Range(1, Infinity)
  assert.equal(powerOfTwoRange.size, Infinity)
  const first1000 = powerOfTwoRange.take(1000).map(n => n * 2)
  assert.equal(first1000.size, 1000)
  assert.end()
})

test('demonstrate chaining with Seq', (assert) => {
  const addPowersOf2 =  Immutable.Range(1, Infinity)
    .filter(n => n % 2 != 0)
    .map(n => n * 2)
  const first1000OddPowers = addPowersOf2.take(1000)
  assert.equal(first1000OddPowers.get(999), 3998)
  assert.end()
})

test('Assertions with tape.', (assert) => {
  const fruits = Immutable.List.of('apple', 'strawberry', 'banana').keys()
  assert.equal(fruits.next().value, 0)
  assert.equal(fruits.next().value, 1)
  assert.end()
})

test('Convert to json', (assert) => {
  const myMap = Map({ a: 1, b: 2, c: 3, d: 3 })
  assert.equal(myMap.toJSON().a, 1)
  assert.end()
})

test('Maintaining order in immutable objects', (assert) => {
  const fruits = Immutable.OrderedMap({ a: 3, b: 2, c: 1, d: 3 })

  function sortBySize(a, b) {
    if (a > b) {
      return -1
    } else if (a < b) {
      return 1
    }
    return 0
  }

  const sortedFruits = fruits.sort(sortBySize)
  const sortedFruitsAscending = fruits.sort(sortBySize).reverse()
  assert.deepEqual(sortedFruits, OrderedMap({ 'a': 3, 'd': 3, 'b': 2, 'c': 1 }))
  assert.deepEqual(sortedFruitsAscending, OrderedMap({ 'c': 1, 'b': 2, 'd': 3, 'a': 3 }))
  assert.end()
})

test('Every', (assert) => {
  const items = Immutable.Map({ a: 3, b: 5, c: 10, d: 3 })
  assert.true(items.every(item => item > 2))
  assert.false(items.every(item => item > 3))
  assert.end()
})

test('Reduce', (assert) => {
  const myMap = Map({ 'a': 3, 'd': 3, 'b': 2, 'c': 1 })
  const reduced = myMap.reduce((acc, item, key, iter) => {
    // console.log(acc, item, key, iter)
    return acc + item
  })
  assert.equal(reduced, 9)
  assert.end()
})

test('Creating group by with reduce', (assert) => {
  const myMap = Map({ 'a': 3, 'd': 3, 'b': 2, 'c': 1 })
  const initial = new Immutable.Map({
    'true': Immutable.List(),
    'false': Immutable.List()
  })
  const greaterThan2 = myMap.reduce((group, item, key, iter) => {
    const result = item > 2 ? 'true' : 'false'
    const newList = group.get(result).push(item)
    return group.set(result, newList)
  }, initial)
  assert.true(greaterThan2.get('true').every(item => item > 2))
  assert.end()
})

test('Equality checks with hash codes', (assert) => {
  const fruits = Immutable.List.of('apple', 'strawberry', 'banana')
  const moreFruits = Immutable.List.of('apple', 'strawberry', 'banana')
  const otherFruits = Immutable.List.of('papaya', 'strawberry', 'mango')
  assert.false(fruits === moreFruits)
  assert.true(Immutable.is(fruits, moreFruits))
  assert.true(fruits.hashCode() === moreFruits.hashCode()) // faster than Immutable.is but could collide
  // can also cache the hashcode and reference in future
  assert.end()
})

test('Immutable Records', (assert) => {
  // Good construct for stores
  // Kind of like a JS class
  const ImmutableRecord = Immutable.Record({
    fruits: ['apple', 'strawberry', 'banana', ['blueberries', 'raspberries']],
    status: true,
    number: 37,
    data: { name: 'Jefferson', occupation: 'Airplane' }
  })
  const immutableRecord = new ImmutableRecord({
    fruits: ['papaya'],
    status: false,
    data: { name: 'Strawberry', occupation: 'Fields' }
  })
  assert.equal(immutableRecord.get('number'), 37, 'record filled in with default values')
  assert.equal(immutableRecord.get('status'), false)
  assert.end()
})


