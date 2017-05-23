import fetch from 'graphql-fetch'

import * as utils from 'react-gnomad'
import * as types from '../constants/actionTypes'

const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8006'

const fetchMinimalGenePage = (geneName, url = LOCAL_API_URL) => {
  const query = `{
    gene(gene_name: "${geneName}") {
      gene_id
      gene_name
      omim_accession
      full_gene_name
      start
      stop
      xstart
      xstop
      minimal_gnomad_variants {
        pos
        variant_id
        rsid
        filter
        allele_num
        allele_count
        allele_freq
        hom_count
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
        reject(error)
      })
  })
}

const regionFetch = (xstart, xstop) => {
  const query = `
  {
    region(xstart: ${xstart}, xstop: ${xstop}) {
      variants: exome_variants {
        variant_id
        pos
        rsid
        filter
        allele_count
        allele_num
        allele_freq
        hom_count
      }
    }
  }`
  return new Promise((resolve, reject) => {
    fetch('http://gnomad-api.broadinstitute.org/')(query)
      .then((data) => {
        resolve(data.data.region)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

export const updateMessage = (message) => {
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

export const requestRegionData = (regionStartXpos, regionStopXpos) => ({
  type: types.REQUEST_REGION_DATA,
  regionStartXpos,
  regionStopXpos,
})

export const receiveRegionData = regionData => ({
  type: types.RECEIVE_REGION_DATA,
  regionData,
})

export const fetchPageDataByGeneName = (geneName) => {
  return (dispatch) => {
    dispatch(requestGeneData(geneName))
    fetchMinimalGenePage(geneName, API_URL)
      .then((geneData) => {
        dispatch(receiveGeneData(geneName, geneData))
        dispatch(requestRegionData(geneData.xstart, geneData.xstop))
        regionFetch(geneData.xstart, geneData.xstart + 5000)
          .then((regionData) => {
            dispatch(receiveRegionData(regionData))
          })
      }
    )
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

//
// export const shouldFetchRegion = (state, start, stop) => {
//
// }
//
// export const fetchRegionIfNeeded = (regionStartXpos, regionStopXpos) => {
//   return (dispatch, getState) => {  // eslint-disable-line
//     const toFetch = shouldFetchRegion(getState(), regionStartXpos, regionStopXpos)
//     if (toFetch !== []) {
//       return dispatch(fetchPageDataByGeneName(toFetch))
//     }
//   }
// }
