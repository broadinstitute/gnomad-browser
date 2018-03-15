/* eslint-disable react/prop-types */

import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import fetch from 'graphql-fetch'

// import {
//   exonPadding,
// } from '@broad/gene-page/src/resources/active'

import {
  currentGene,
  geneData,
  exonPadding,
  actions as geneActions,
} from '@broad/redux-genes'

import RegionViewer from './RegionViewer'

const API_URL = 'http://gnomad-api2.broadinstitute.org'

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
    const { exonPadding, geneData, children, ...rest } = this.props

    if (!geneData) {
      return <div>Loading</div>
    }

    const geneJS = geneData.toJS()
    const canonicalExons = geneJS.transcript.exons

    return (
      <RegionViewer
        width={500}
        padding={exonPadding}
        regions={canonicalExons}
        rightPanelWidth={100}
        {...rest}
      >
        {children}
      </RegionViewer>
    )
  }
}

const mapStateToProps = state => ({
  exonPadding: exonPadding(state),
  geneData: geneData(state),
  currentGene: currentGene(state),
})

export default connect(mapStateToProps, geneActions)(GeneViewer)
