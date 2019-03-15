function isEmpty(val) {
  return val === undefined || val === null || val === ''
}

const makeComparator = (key, fn) => (v1, v2) => {
  if (isEmpty(v1[key])) {
    return 1
  }
  if (isEmpty(v2[key])) {
    return -1
  }
  return fn(v1[key], v2[key])
}

const makeStringComparator = key => makeComparator(key, (v1, v2) => v1.localeCompare(v2))

const makeNumericComparator = key => makeComparator(key, (v1, v2) => v1 - v2)

const comparators = {
  variant_id: makeStringComparator('variant_id'),
  consequence: makeStringComparator('consequence'),
  type: makeStringComparator('type'),
  pos: makeNumericComparator('pos'),
  length: makeNumericComparator('length'),
  ac: makeNumericComparator('ac'),
  an: makeNumericComparator('an'),
  af: makeNumericComparator('af'),
  ac_hom: makeNumericComparator('ac_hom'),
}

const sortVariants = (variants, { sortKey, sortOrder }) => {
  if (!variants.length) {
    return []
  }

  const baseComparator = comparators[sortKey]
  const comparator = sortOrder === 'ascending' ? baseComparator : (a, b) => baseComparator(b, a)

  return [...variants].sort(comparator)
}

export default sortVariants
