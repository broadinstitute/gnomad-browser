import variantResultColumns from './variantResultColumns'

function isEmpty(val) {
  return val === undefined || val === null || val === ''
}

const makeComparator = (key, fn) => {
  const comparator = (v1, v2) => fn(v1, v2)
  comparator.key = key
  return comparator
}

const makeStringComparator = key => makeComparator(key, (v1, v2) => v1.localeCompare(v2))

const makeNumericComparator = key => makeComparator(key, (v1, v2) => v1 - v2)

const comparators = {
  variant_id: makeNumericComparator('pos'),
  hgvsc: makeStringComparator('hgvsc'),
  hgvsp: makeStringComparator('hgvsp'),
  consequence: makeStringComparator('consequence'),
  ac_case: makeNumericComparator('ac_case'),
  an_case: makeNumericComparator('an_case'),
  ac_ctrl: makeNumericComparator('ac_ctrl'),
  an_ctrl: makeNumericComparator('an_ctrl'),
  af_case: makeNumericComparator('af_case'),
  af_ctrl: makeNumericComparator('af_ctrl'),
  ...variantResultColumns.reduce(
    (acc, c) => ({ ...acc, [c.key]: makeNumericComparator(c.key) }),
    {}
  ),
}

const sortVariants = (variants, { sortKey, sortOrder }) => {
  const baseComparator = comparators[sortKey]
  const comparator = sortOrder === 'ascending' ? baseComparator : (a, b) => baseComparator(b, a)

  return [...variants].sort((v1, v2) => {
    // Always sort null values to end of list
    if (isEmpty(v1[baseComparator.key])) {
      return 1
    }
    if (isEmpty(v2[baseComparator.key])) {
      return -1
    }
    return comparator(v1[baseComparator.key], v2[baseComparator.key])
  })
}

export default sortVariants
