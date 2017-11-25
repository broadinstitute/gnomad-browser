/* eslint-disable react/prop-types */

import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import fetch from 'graphql-fetch'

// import {
//   exonPadding,
// } from '@broad/gene-page/src/resources/active'

import {
  currentGene,
  canonicalExons,
  hasGeneData,
  actions as geneActions,
} from '@broad/redux-genes'

import RegionViewer from './RegionViewer'

const API_URL = 'http://localhost:8007'

class GeneViewer extends PureComponent {
  componentDidMount() {
    const { currentGene, fetchPageDataByGene } = this.props
    fetchPageDataByGene(currentGene, this.fetchData)
  }

  fetchData = (geneName, url = API_URL) => {
    console.log(geneName)
    const query = `{
      gene(gene_name: "${geneName}") {
        gene_name
        strand
        transcript {
          exons {
            feature_type
            start
            stop
            strand
          }
        }
      }
    }`

    return new Promise((resolve, reject) => {
      fetch(url)(query)
        .then((data) => {
          resolve(data.data.gene)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  render() {
    const { exonPadding, hasGeneData, canonicalExons, children, ...rest } = this.props
    console.log(canonicalExons, hasGeneData)
    if (!hasGeneData) {
      return <div>Loading</div>
    }

    return (
      <RegionViewer
        width={500}
        padding={exonPadding}
        regions={canonicalExons.toJS()}
        rightPanelWidth={100}
        {...rest}
      >
        {children}
      </RegionViewer>
    )
  }
}

const mapStateToProps = state => ({
  // exonPadding: exonPadding(state),
  hasGeneData: hasGeneData(state),
  canonicalExons: canonicalExons(state),
  currentGene: currentGene(state),
})

export default connect(mapStateToProps, geneActions)(GeneViewer)
