import fetch from 'graphql-fetch'

import * as utils from 'react-gnomad'
import * as types from '../constants/actionTypes'

// const API_URL = 'http://gnomad-api.broadinstitute.org/'

const API_URL = 'http://localhost:8006'

const fetchMinimalGenePage = (geneName, url = API_URL) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      start
      stop
      minimal_gnomad_variants {
        pos
        allele_freq
        consequence
      }
      exome_coverage {
        pos
        mean
      }
      genome_coverage {
        pos
        mean
      }
      transcript {
        exons {
          feature_type
          start
          stop
          strand
        }
      }
      exons {
        _id
        start
        transcript_id
        feature_type
        strand
        stop
        chrom
        gene_id
      }
  }
}`
  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}

export const updateMessage = (message) => {
  console.log(message)
  return {
    type: types.UPDATE_MESSAGE,
    message,
  }
}

export const setCurrentGene = (geneName) => {
  return {
    type: types.SET_CURRENT_GENE,
    geneName,
  }
}

export const requestGeneData = currentGene => ({
  type: types.REQUEST_GENE_DATA,
  currentGene,
})

export const receiveGeneData = (currentGene, geneData) => ({
  type: types.RECEIVE_GENE_DATA,
  geneName: currentGene,
  geneData,
})

export const fetchPageDataByGeneName = (geneName) => {
  console.log(geneName)
  return (dispatch) => {
    dispatch(requestGeneData(geneName))
    // utils.fetchAllByGeneName(geneName, API_URL)
    fetchMinimalGenePage(geneName, API_URL)
      .then(geneData => dispatch(receiveGeneData(geneName, geneData)))
  }
}

export const shouldFetchVariants = (state, currentGene) => {
  const gene = state.genes.allGeneNames[currentGene]
  if (!gene) {
    return true
  }
  if (state.genes.isFetching) {
    return false
  }
  return false
}

export const fetchVariantsIfNeeded = (currentGene) => {
  return (dispatch, getState) => {  // eslint-disable-line
    if (shouldFetchVariants(getState(), currentGene)) {
      return dispatch(fetchPageDataByGeneName(currentGene))
    }
  }
}
