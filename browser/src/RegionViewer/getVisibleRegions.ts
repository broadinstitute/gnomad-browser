const getVisibleRegions = (regions: any, clipRegion: any) => {
  if (!clipRegion) {
    return regions
  }

  const visibleRegion = []

  for (let i = 0; i < regions.length; i += 1) {
    const { start, stop } = regions[i]

    if (start <= clipRegion.stop && stop >= clipRegion.start) {
      visibleRegion.push({
        start: Math.max(start, clipRegion.start),
        stop: Math.min(stop, clipRegion.stop),
      })
    }
  }

  return visibleRegion
}

export default getVisibleRegions
