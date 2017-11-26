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
      }
    }
  }
})

class GeneViewer extends PureComponent {
  render() {
    const { data: { gene, loading, error }, exonPadding, children, ...rest } = this.props
    if (error) {
      return <div>{error.message}</div>
    }
    if (loading) {
      return <div>Loading</div>
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
  withGeneViewerQuery
)(GeneViewer)
