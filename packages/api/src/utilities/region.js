export const extendRegions = (amount, regions) =>
  regions.map(({ start, stop, xstart, xstop, ...rest }) => ({
    ...rest,
    start: start - amount,
    stop: stop + amount,
    xstart: xstart - amount,
    xstop: xstop + amount,
  }))

/**
 * Create a minimal representation of a set of regions.
 * xstart and xstop are inclusive.
 *
 * @example
 * // returns { xstart: 0, xstop: 10 }
 * mergeOverlappingRegions([{ xstart: 0, xstop: 7 }, { xstart: 3, xstop: 10 }])
 *
 * @param {Object[]} sortedRegions - Regions ordered by xstart
 * @param {number} sortedRegions[].xstart
 * @param {number} sortedRegions[].xstop
 */
export const mergeOverlappingRegions = sortedRegions => {
  if (sortedRegions.length === 0) {
    return []
  }

  const mergedRegions = [{ ...sortedRegions[0] }]

  let previousRegion = mergedRegions[0]

  for (let i = 1; i < sortedRegions.length; i += 1) {
    const nextRegion = sortedRegions[i]

    if (nextRegion.xstart <= previousRegion.xstop + 1) {
      if (nextRegion.xstop > previousRegion.xstop) {
        previousRegion.stop = nextRegion.stop
        previousRegion.xstop = nextRegion.xstop
      }
    } else {
      previousRegion = { ...nextRegion }
      mergedRegions.push(previousRegion)
    }
  }

  return mergedRegions
}

export const totalRegionSize = regions =>
  regions.reduce((acc, { start, stop }) => acc + stop - start, 0)
