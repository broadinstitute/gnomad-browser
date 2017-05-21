import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import * as actions from '../../actions'
import { getGene, getAllVariantsAsArray } from '../../reducers'

import css from './styles.css'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    setCurrentGene: PropTypes.func.isRequired,
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const {
      dispatch,
      currentGene,
    } = this.props
    dispatch(actions.fetchVariantsIfNeeded(currentGene))
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.currentGene !== nextProps.currentGene) {
      const { dispatch } = this.props
      dispatch(actions.fetchVariantsIfNeeded(nextProps.currentGene))
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = (state) => {
  const { selections: { currentGene }, genes: { isFetching } } = state
  return {
    currentGene,
    isFetching,
    gene: getGene(state, currentGene),
    variants: getAllVariantsAsArray(state),
    hasVariants: state.variants.status.hasData,
    fetchingVariants: state.variants.status.isFetching,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,
    setCurrentGene: geneName => dispatch(actions.setCurrentGene(geneName)),
  }
}

const GenePageHOC = ComposedComponent =>
  connect(mapStateToProps, mapDispatchToProps)(GenePageContainer(ComposedComponent))

export default GenePageHOC
