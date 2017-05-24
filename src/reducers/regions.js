
import { combineReducers } from 'redux'

const regionsByGroupId = (state = {}, action) => {
  switch (action.type) {
    case types.RECEIVE_GENE_DATA: // TODO should recieve list of available datasets
      const { exome_coverage, genome_coverage } = action.geneData
      return {

      }
    default:
      return state
  }
}

{/* const byRegion = (state = {}, action) => {
  switch (action.type) {
    case 'RECEIVE_REGION':
      return {
        ...state,
        [`${action.chromosome}-${action.start}-${action.stop}`]: {
          ...action.data,
        },
      }
    default:
      return state
  }
}

// const regions = combineReducers({
//   byRegion,
// })

export default regions

export const getRegion = (state, regionId) => state.byRegion[regionId] */}
