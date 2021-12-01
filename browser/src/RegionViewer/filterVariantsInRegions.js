const filterVariantsInRegions = (variants, regions) => {
  if (regions.length === 0) {
    return []
  }
  const sortedRegions = [...regions].sort((r1, r2) => r1.start - r2.start)
  let currentRegion = sortedRegions.shift()
  return variants.filter(v => {
    while (v.pos > currentRegion.stop && sortedRegions.length > 0) {
      currentRegion = sortedRegions.shift()
    }
    const isInRegion = currentRegion && currentRegion.start <= v.pos && v.pos <= currentRegion.stop
    return isInRegion
  })
}

export default filterVariantsInRegions
