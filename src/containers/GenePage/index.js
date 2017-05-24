/* eslint-disable react/no-unused-prop-types */
import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import * as actions from '../../actions'
import { getGene, getAllVariantsAsArray } from '../../reducers'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    setCurrentGene: PropTypes.func.isRequired,
    fetchVariantsIfNeeded: PropTypes.func.isRequired,
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const { currentGene, fetchVariantsIfNeeded } = this.props
    fetchVariantsIfNeeded(currentGene)
  }

  componentWillReceiveProps(nextProps) {
    const { fetchVariantsIfNeeded } = this.props
    if (this.props.currentGene !== nextProps.currentGene) {
      fetchVariantsIfNeeded(nextProps.currentGene)
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = (state) => {
  const {
    selections: { currentGene },
    genes: { isFetching },

  } = state
  return {
    currentGene,
    isFetching,
    gene: getGene(state, currentGene),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchVariantsIfNeeded: currentGene => dispatch(actions.fetchVariantsIfNeeded(currentGene)),
    setCurrentGene: geneName => dispatch(actions.setCurrentGene(geneName)),
  }
}

const GenePageHOC = ComposedComponent =>
  connect(mapStateToProps, mapDispatchToProps)(GenePageContainer(ComposedComponent))

export default GenePageHOC
