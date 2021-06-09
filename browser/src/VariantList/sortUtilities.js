export const isEmpty = val => val === undefined || val === null || val === ''

export const makeCompareFunction = (key, fn) => (v1, v2) => {
  let key1
  let key2

  if (typeof key === 'function') {
    key1 = key(v1)
    key2 = key(v2)
  } else {
    key1 = v1[key]
    key2 = v2[key]
  }

  if (isEmpty(key1)) {
    return 1
  }
  if (isEmpty(key2)) {
    return -1
  }
  return fn(key1, key2)
}

export const makeStringCompareFunction = key =>
  makeCompareFunction(key, (v1, v2) => v1.localeCompare(v2))

export const makeNumericCompareFunction = key => makeCompareFunction(key, (v1, v2) => v1 - v2)
