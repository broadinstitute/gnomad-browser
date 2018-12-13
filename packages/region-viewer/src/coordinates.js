import R from 'ramda'
import { scaleLinear } from 'd3-scale'

const FEATURES_TO_DISPLAY = ['CDS']

export const filterRegions = R.curry((featureTypes, regions) => {
  const filteredRegions = regions.filter(r => featureTypes.includes(r.feature_type))
  return filteredRegions.length ? filteredRegions : regions
})

const sortRegions = regions => [...regions].sort((r1, r2) => r1.start - r2.start)

export const calculateRegionDistances = regions =>
  regions.map((region, i) => {
    if (i === 0) {
      return {
        ...region,
        previousRegionDistance: Infinity,
      }
    }
    return {
      ...region,
      previousRegionDistance: region.start - regions[i - 1].stop,
    }
  })

export const addPadding = R.curry((padding, regions) => {
  if (padding === 0) return regions
  return regions.reduce((acc, region) => {
    const startPad = {
      feature_type: 'start_pad',
      start: region.start - padding,
      stop: region.start - 1,
    }

    const endPad = {
      feature_type: 'end_pad',
      start: region.stop + 1,
      stop: region.stop + padding,
    }

    // check if total padding greater than distance between exons
    if (region.previousRegionDistance < padding * 2) {
      return [
        ...R.init(acc), // remove previous end_pad
        {
          feature_type: 'intron',
          start: region.start - region.previousRegionDistance,
          stop: region.start - 1,
        },
        region,
        endPad,
      ]
    }
    return [...acc, startPad, region, endPad]
  }, [])
})

export const calculateOffset = R.curry(regions =>
  regions.reduce((acc, region, i) => {
    if (i === 0) return [{ ...region, offset: 0 }]
    return [
      ...acc,
      {
        ...region,
        offset: acc[i - 1].offset + (region.start - acc[i - 1].stop),
      },
    ]
  }, [])
)

export const calculateOffsetRegions = (
  featuresToDisplay = FEATURES_TO_DISPLAY,
  padding = 50,
  regions
) =>
  R.pipe(
    filterRegions(featuresToDisplay),
    sortRegions,
    calculateRegionDistances,
    addPadding(padding),
    calculateOffset
  )(regions)

export const calculatePositionOffset = R.curry((regions, position) => {
  const lastRegionBeforePosition = R.findLast(region => region.start <= position)(regions)

  if (lastRegionBeforePosition) {
    // Position is within a region
    if (position < lastRegionBeforePosition.stop) {
      return {
        offsetPosition: position - lastRegionBeforePosition.offset,
      }
    }

    // Position is between regions
    return {
      offsetPosition: lastRegionBeforePosition.stop - lastRegionBeforePosition.offset,
    }
  }

  // Position is before first region
  return {
    offsetPosition: regions[0].start - regions[0].offset,
  }
})

export const invertPositionOffset = R.curry((regions, xScale, scaledPosition) => {
  let result = 0
  for (let i = 0; i < regions.length; i++) {
    if (
      scaledPosition >= xScale(regions[i].start - regions[i].offset) &&
      scaledPosition <= xScale(regions[i].stop - regions[i].offset)
    ) {
      result = Math.floor(xScale.invert(scaledPosition) + regions[i].offset)
    }
  }
  return result
})

export const calculateXScale = (width, offsetRegions) =>
  scaleLinear()
    .domain([
      offsetRegions[0].start,
      offsetRegions[offsetRegions.length - 1].stop - offsetRegions[offsetRegions.length - 1].offset,
    ])
    .range([0, width])
