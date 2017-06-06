
import * as types from '../constants/actionTypes'

const coverage = (state = {
  isFetching: false,
}, action) => {
  switch (action.type) {
    case types._RECEIVE_GENE_DATA:
      // TODO to make generic, recieve list of available datasets to map over
      const { exome_coverage, genome_coverage } = action.geneData
      return {
        ...state,
        exome_coverage,
        genome_coverage,
      }
    default:
      return state
  }
}

export default coverage
