/* eslint-disable import/first */

import { actions as activeActions } from './resources/active'

export const {
  setCurrentGene,
  setNavigatorPosition,
  setCurrentTableIndex,
  setCurrentTableScrollData,
  setRegionViewerAttributes,
  setExonPadding,
  setVisibleInTable,
  onNavigatorClick,
} = activeActions

export {
  actions as activeActions,
  currentGene,
  currentNavigatorPosition,
  currentTableIndex,
  currentTableScrollData,
  exonPadding,
  regionViewerIntervals,
  tablePosition,
  default as createActiveReducer,
} from './resources/active'

import { actions as geneActions } from './resources/genes'

export const {
  requestGeneData,
  receiveGeneData,
  fetchPageDataByGeneName,
  shouldFetchGene,
  fetchGeneIfNeeded,
} = geneActions

export {
  actions as geneActions,
  byGeneName,
  allGeneNames,
  isFetching as genesIsFetching,
  geneData,
  default as createGeneReducer
} from './resources/genes'

import { actions as variantActions } from './resources/variants'

export const {
  requestVariantsByPosition,
  setHoveredVariant,
  setFocusedVariant,
  setSelectedVariantDataset,
  receiveVariants,
  fetchVariantsByStartStop,
  shouldFetchVariants,
  fetchVariantsIfNeeded,
  setVariantFilter,
  setVariantSort,
  searchVariants,
} = variantActions

export {
  actions as variantActions,
  hoveredVariant,
  selectedVariantDataset,
  variantDatasetKeys,
  allVariantsInCurrentDataset,
  allVariantsInCurrentDatasetAsList,
  singleVariantData,
  variantSortKey,
  variantSortAscending,
  variantFilter,
  visibleVariantsById,
  visibleVariantsList,
  variantCount,
  variantSearchText,
  variantSearchResult,
  filteredIdList,
  finalFilteredVariants,
  finalFilteredVariantsCount,
  default as createVariantReducer
} from './resources/variants'

export {
  FetchHoc,
  VariantTableConnected,
  NavigatorConnected,
} from './containers'
