/* eslint-disable react/prop-types */

import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { graphql, compose } from 'react-apollo'
import {
  currentGene,
  exonPadding,
} from '@broad/redux-genes'

import RegionViewer from './RegionViewer'
import GeneViewerQuery from './query.graphql'

const withGeneViewerQuery = graphql(GeneViewerQuery, {
  options: ({ currentGene }) => {
    return {
      variables: {
        geneName: currentGene
      },
      errorPolicy: 'ignore',
      // errorPolicy: 'none',
      // errorPolicy: 'all',
      // fetchPolicy: 'network-only'
    }
  }
})

class GeneViewer extends PureComponent {
  render() {
    // console.log('data', this.props.data)
    console.log(this.props)
    console.log('gene', this.props.currentGene)
    console.log('loading', this.props.data.loading)
    console.log('network status', this.props.data.networkStatus)
    console.log('gene data', this.props.data.gene)
    console.log('error', this.props.data.error)
    const { data: { gene, loading, error }, exonPadding, children, ...rest } = this.props
    if (this.props.data.networkStatus === 1) {
      return <div>Loading {this.props.currentGene} {this.props.data.variables.geneName}</div>
    }
    if (!gene) {
      return <div>{'Gene not found'}</div>
    }
    return (
      <div>
        {gene.gene_name}
        <RegionViewer
          width={500}
          padding={exonPadding}
          regions={gene.transcript.exons}
          rightPanelWidth={100}
          {...rest}
        >
          {children}
        </RegionViewer>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  exonPadding: exonPadding(state),
  currentGene: currentGene(state),
})

export default compose(
  connect(mapStateToProps),
  withGeneViewerQuery,
)(GeneViewer)
