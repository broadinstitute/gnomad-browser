import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import GeneSettings from '../GeneSettings'
import GeneRegion from '../Regions'

import * as actions from '../../actions'
import { getGene } from '../../reducers'

import css from './styles.css'

class GenePage extends Component {
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
    const { isFetching, gene } = this.props
    if (isFetching || !gene) {
      return <div>Loading...</div>
    }
    const { currentGene } = this.props
    return (
      <div className={css.browser}>
        <GeneSettings
          currentGene={currentGene}
          setCurrentGene={this.props.setCurrentGene}
        />
        <h1>{currentGene}</h1>
        {gene.gene_id}
        <GeneRegion
          gene={gene}
        />
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  const { selections: { currentGene }, genes: { isFetching } } = state
  return {
    currentGene,
    isFetching,
    gene: getGene(state, currentGene),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,
    setCurrentGene: geneName => dispatch(actions.setCurrentGene(geneName)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GenePage)
