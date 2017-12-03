// import RegionViewer from './RegionViewer'

export {
  types,
  actions,
  default as createRegionReducer,
  currentRegion,
  byRegionName,
  allRegionNames,
  isFetching,
  regionData,
} from './regionRedux'

export {
  coverageConfigClassic,
  coverageConfigNew,
  markerConfigOther,
  markerExacClassic,
  attributeConfig,
} from './regionViewerStyles'

export {
  default as RegionHoc,
} from './RegionHoc'

export {
  default as RegionViewer,
  // RegionViewer as default,
} from './RegionViewer'

export {
  default as GeneViewer,
} from './GeneViewerReduxConnected'
