/* eslint-disable react/prop-types */
/* eslint-disable arrow-parens */
/* eslint-disable no-shadow */
import R from 'ramda'
import { scaleLinear } from 'd3-scale'

// const EXON_PADDING = 50
const FEATURES_TO_DISPLAY = [
  'CDS',
  // 'padding'
  // 'UTR',
  // 'exon',
]

export const filterRegions = R.curry((featureList, regions) =>
  regions.filter(
    region => R.contains(region.feature_type, featureList),
  ),
)

export const addPadding = R.curry((padding, regions) =>
  regions.reduce((acc, region, i) => {
    let startPad
    if (i !== 0) {
      startPad = {
        feature_type: 'start_pad',
        start: region.start - padding,
        stop: region.start - 1,
      }
    }
    const endPad = {
      feature_type: 'end_pad',
      start: region.stop + 1,
      stop: region.stop + padding,
    }
    if (i === 0) {
      return [
        ...acc,
        { ...region },
        endPad,
      ]
    }
    if (padding > (region.start - acc[i - 1].stop)) {
      return [
        ...acc,
        { ...region },
      ]
    }
    return [
      ...acc,
      startPad,
      { ...region },
      endPad,
    ]
  }, []))

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

export const assignAttributes = R.map(region => {
  if (region.feature_type === 'CDS') {
    return {
      ...region,
      color: '#FFB33D',
      thickness: '30px',
    }
  }
  if (region.feature_type === 'exon') {
    return {
      ...region,
      color: '',
      thickness: '30px',
    }
  }
  if (region.feature_type === 'start_pad') {
    return {
      ...region,
      color: '#28BCCC',
      thickness: '5px',
    }
  }
  if (region.feature_type === 'end_pad') {
    return {
      ...region,
      color: '#BEEB9F',
      thickness: '5px',
    }
  }
  return {
    ...region,
    color: 'grey',
    thickness: '1px',
  }
})

export const calculateOffsetRegions = (
  featuresToDisplay = FEATURES_TO_DISPLAY,
  padding = 50,
  regions,
) => R.pipe(
  // R.tap(console.log),
  filterRegions(featuresToDisplay),
  addPadding(padding),
  calculateOffset,
  assignAttributes,
  // R.tap(console.log),
)(regions)

export const calculatePositionOffset = R.curry((regions, position) => {
  let result = 0
  for (let i = 0; i < regions.length; i++) {
    if (position >= regions[i].start && position <= regions[i].stop) {
      result = {
        offsetPosition: position - regions[i].offset,
        color: regions[i].color,
      }
    }
  }
  return result
})

export const calculateXScale = (width, offsetRegions) => {
  return scaleLinear()
    .domain([
      offsetRegions[0].start,
      offsetRegions[offsetRegions.length - 1].stop -
      offsetRegions[offsetRegions.length - 1].offset,
    ])
    .range([0, width])
}
