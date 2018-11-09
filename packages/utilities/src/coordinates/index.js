/* eslint-disable react/prop-types */
/* eslint-disable arrow-parens */
/* eslint-disable no-shadow */
import R from 'ramda'
import { scaleLinear, scaleBand } from 'd3-scale'

// const EXON_PADDING = 50
const FEATURES_TO_DISPLAY = [
  'CDS',
  // 'padding'
  // 'UTR',
  // 'exon',
]

export const filterRegions = featureTypes => regions => {
  const filteredRegions = regions.filter(r => featureTypes.includes(r.feature_type))
  return filteredRegions.length ? filteredRegions : regions
}

export const applyExonSubset = R.curry((exonSubset, regions) => {
  if (exonSubset) {
    const [start, stop] = exonSubset
    return regions.slice(start, stop)
  }
  return regions
})

export const flipOrderIfNegativeStrand = regions => {
  if (R.all(region => region.strand === '-', regions)) {
    return R.reverse(regions)
  } else if (R.all(region => region.strand === '+', regions)) {
    return regions
  }
  throw Error('There is mix of (+) and (-) strands...')
}

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
  return regions.reduce((acc, region, i) => {
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
    return [
      ...acc,
      startPad,
      region,
      endPad,
    ]
  }, [])
})

export const calculateOffset = R.curry((regions) =>
  regions.reduce((acc, region, i) => {
    if (i === 0) return [{ ...region, offset: 0 }]
    return [
      ...acc,
      {
        ...region,
        offset: acc[i - 1].offset + (region.start - acc[i - 1].stop),
      },
    ]
  }, []))

export const defaultAttributeConfig = {
  CDS: {
    color: '#FFB33D',
    thickness: '30px',
  },
  start_pad: {
    color: '#28BCCC',
    thickness: '5px',
  },
  end_pad: {
    color: '#BEEB9F',
    thickness: '5px',
  },
  intron: {
    color: '#FF9559',
    thickness: '5px',
  },
  default: {
    color: '#grey',
    thickness: '5px',
  },
}

export const assignAttributes = R.curry((attributeConfig, regions) => {
  return regions.map(region => {
    const { feature_type } = region

    if (attributeConfig[feature_type]) {
      return {
        ...region,
        color: attributeConfig[feature_type].color,
        thickness: attributeConfig[feature_type].thickness,
      }
    }

    return {
      ...region,
      color: attributeConfig.default.color,
      thickness: attributeConfig.default.thickness,
    }
  })
})

export const calculateOffsetRegions = (
  featuresToDisplay = FEATURES_TO_DISPLAY,
  attributeConfig = defaultAttributeConfig,
  padding = 50,
  regions,
  exonSubset
) => R.pipe(
  filterRegions(featuresToDisplay),
  applyExonSubset(exonSubset),
  flipOrderIfNegativeStrand,
  calculateRegionDistances,
  addPadding(padding),
  calculateOffset,
  assignAttributes(attributeConfig),
)(regions)

export const calculatePositionOffset = R.curry((regions, position) => {
  const lastRegionBeforePosition = R.findLast(region => region.start <= position)(regions)

  if (lastRegionBeforePosition) {
    // Position is within a region
    if (position < lastRegionBeforePosition.stop) {
      return {
        offsetPosition: position - lastRegionBeforePosition.offset,
        color: lastRegionBeforePosition.color,
      }
    }

    // Position is between regions
    return {
      offsetPosition: lastRegionBeforePosition.stop - lastRegionBeforePosition.offset,
      color: lastRegionBeforePosition.color,
    }
  }

  // Position is before first region
  return {
    offsetPosition: regions[0].start - regions[0].offset,
    color: regions[0].color,
  }
})

export const invertPositionOffset = R.curry((regions, xScale, scaledPosition) => {
  let result = 0
  for (let i = 0; i < regions.length; i++) {
    if (scaledPosition >= xScale(regions[i].start - regions[i].offset)
      && scaledPosition <= xScale(regions[i].stop - regions[i].offset)
    ) {
      result = Math.floor(xScale.invert(scaledPosition) + regions[i].offset)
    }
  }
  return result
})

export const calculateXScale = (width, offsetRegions, band = null) => {
  if (band) {
    return scaleBand()
      .domain([
        offsetRegions[0].start,
        offsetRegions[offsetRegions.length - 1].stop -
        offsetRegions[offsetRegions.length - 1].offset,
      ])
      .rangeRound([0, width])
      .padding(band)
  }
  return scaleLinear()
    .domain([
      offsetRegions[0].start,
      offsetRegions[offsetRegions.length - 1].stop -
      offsetRegions[offsetRegions.length - 1].offset,
    ])
    .range([0, width])
}
