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
  variant_id: makeNumericComparator('pos'),
  consequence: makeStringComparator('consequence'),
  flags: (v1, v2) => v1.flags.length - v2.flags.length,
  allele_count: makeNumericComparator('allele_count'),
  allele_num: makeNumericComparator('allele_num'),
  allele_freq: makeNumericComparator('allele_freq'),
  hom_count: makeNumericComparator('hom_count'),
  hemi_count: makeNumericComparator('hemi_count'),
}

const sortVariants = (variants, { sortKey, sortOrder }) => {
  const baseComparator = comparators[sortKey]
  const comparator = sortOrder === 'ascending' ? baseComparator : (a, b) => baseComparator(b, a)

  return [...variants].sort(comparator)
}

export default sortVariants
