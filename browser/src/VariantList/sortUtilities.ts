export const isEmpty = (val: any) => val === undefined || val === null || val === ''

export const makeCompareFunction = (key: any, fn: any) => (
  v1: any,
  v2: any,
  order = 'ascending'
) => {
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

  return order === 'ascending' ? fn(key1, key2) : fn(key2, key1)
}

export const makeStringCompareFunction = (key: any) =>
  makeCompareFunction(key, (v1: any, v2: any) => v1.localeCompare(v2))

export const makeNumericCompareFunction = (key: any) =>
  makeCompareFunction(key, (v1: any, v2: any) => v1 - v2)
