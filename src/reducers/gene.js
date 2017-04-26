import * as geneTypes from '../constants/actionTypes'

const gene = (state = {}, action) => {
  switch (action.type) {
    case geneTypes.RECEIVE_GENE_DATA:
      return action.geneData
    default:
      return state
  }
}
export default gene
