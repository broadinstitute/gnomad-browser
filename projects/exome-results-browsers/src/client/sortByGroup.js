import browserConfig from '@browser/config'

const groupOrder = browserConfig.analysisGroups.order

let sortFunction
if (groupOrder) {
  const groupIndex = groupOrder.reduce(
    (acc, group, i) => ({
      ...acc,
      [group]: i,
    }),
    {}
  )
  sortFunction = (groupA, groupB) => groupIndex[groupA] - groupIndex[groupB]
} else {
  sortFunction = (groupA, groupB) => groupA.localeCompare(groupB)
}

const sortByGroup = (list, key = 'analysis_group') =>
  list.sort((a, b) => sortFunction(a[key], b[key]))

export default sortByGroup
