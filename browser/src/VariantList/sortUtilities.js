export const isEmpty = val => val === undefined || val === null || val === ''

export const makeCompareFunction = (key, fn) => (v1, v2) => {
  if (isEmpty(v1[key])) {
    return 1
  }
  if (isEmpty(v2[key])) {
    return -1
  }
  return fn(v1[key], v2[key])
}

export const makeStringCompareFunction = key =>
  makeCompareFunction(key, (v1, v2) => v1.localeCompare(v2))

export const makeNumericCompareFunction = key => makeCompareFunction(key, (v1, v2) => v1 - v2)
