import fetch from 'graphql-fetch'

import * as types from '../constants/actionTypes'

const LOCAL_API_URL = 'http://gnomad-api.broadinstitute.org/'
const API_URL = 'http://localhost:8006'

const fetchGenePage = (geneName, url = LOCAL_API_URL) => {
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
        variant_id
        rsid
        pos
        hgvsc
        hgvsp
        allele_count
        allele_freq
        allele_num
        filters
        pass
        hom_count
        consequence
        lof
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

export const setExonPadding = (padding) => {
  return {
    type: types.SET_EXON_PADDING,
    padding,
  }
}

export const setCurrentGene = (geneName) => {
  return {
    type: types.SET_CURRENT_GENE,
    geneName,
  }
}

export const setCurrentVariant = (variantId) => {
  return {
    type: types.SET_CURRENT_VARIANT,
    variantId,
  }
}

export const setNavigatorPosition = navigatorPosition => ({
  type: types.SET_CURRENT_NAVIGATOR_POSITION,
  navigatorPosition,
  meta: {
    throttle: true,
  },
})

export const setCurrentTableIndex = tableIndex => ({
  type: types.SET_CURRENT_TABLE_INDEX,
  tableIndex,
  meta: {
    throttle: true,
  },
})


export const requestGeneData = currentGene => ({
  type: types.REQUEST_GENE_DATA,
  currentGene,
})

export const receiveGeneData = (currentGene, geneData) => {
  console.log('recieved data')
  return {
    type: types.RECEIVE_GENE_DATA,
    geneName: currentGene,
    datasets: ['minimal_gnomad_variants'],
    geneData,
  }
}

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
    fetchGenePage(geneName, API_URL)
      .then((geneData) => {
        dispatch(receiveGeneData(geneName, geneData))
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

export const setVariantSort = (key) => {
  return {
    type: types.SET_VARIANT_SORT,
    key,
  }
}

export const setVisibleInTable = (range) => {
  return {
    type: types.SET_VISIBLE_IN_TABLE,
    range,
  }
}

export const onNavigatorClick = (tableIndex, position) => {
  return (dispatch) => {
    dispatch({ type: types.ORDER_VARIANTS_BY_POSITION })
    dispatch(setCurrentTableIndex(tableIndex))
    dispatch(setNavigatorPosition(position))
  }
}
