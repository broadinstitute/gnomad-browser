import R from 'ramda'
import * as geneTypes from '../constants/actionTypes'

const variantIdsByDataset = (state = [], action, datasetId) => {
  switch (action.type) {
    case geneTypes.RECEIVE_GENE_DATA:
      const { geneData } = action
      return {
        ...state,
        [datasetId]: geneData[datasetId].map(v => v.variant_id),
      }
    default:
      return state
  }
}

const gene = (state = {}, action) => {
  switch (action.type) {
    case geneTypes.RECEIVE_GENE_DATA:
      // const { geneData, datasets } = action
      // return datasets.reduce((acc, datasetId) => ({
      //   ...R.dissoc(datasetId, acc),
      //   variantIdsByDataset: variantIdsByDataset(state[variantIdsByDataset], action, datasetId),
      // }), geneData)
      return action.geneData
    default:
      return state
  }
}
export default gene
