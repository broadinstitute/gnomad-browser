import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import { fetchVariantsIfNeeded } from '../../actions'
import { getGene } from '../../reducers'

import css from './styles.css'

class GenePage extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
  }

  componentDidMount() {
    const {
      dispatch,
      currentGene,
    } = this.props
    console.log('mount', currentGene)
    dispatch(fetchVariantsIfNeeded(currentGene))
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.currentGene !== nextProps.currentGene) {
      const { dispatch } = this.props
      console.log(this.props.currentGene)
      dispatch(fetchVariantsIfNeeded(nextProps.currentGene))
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
        <h1>{currentGene}</h1>
        {gene.gene_id}
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  const { selections: { currentGene }, genes: { isFetching } } = state
  console.log(state)
  return {
    currentGene,
    isFetching,
    gene: getGene(state, currentGene),
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dispatch,
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GenePage)
