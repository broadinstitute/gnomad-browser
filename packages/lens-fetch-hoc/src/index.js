/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

/**
 * HOC for checking if data needs fetching using React lifecycle methods
 * Pass component to be wrapped, a data id to compare, function for checking
 * if the store already has data, and the function for fetching data if needed.
 * Returns connected component.
 */

import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

const FetchDataHOC = (
  ComposedComponent,
  currentIdSelector,
  shouldFetchData,
  fetchFunction,
) => {
  const fetchDataIfNeeded = (currentId) => {
    return (dispatch, getState) => {  // eslint-disable-line
      if (shouldFetchData(getState())) {
        return dispatch(fetchFunction(currentId))
      }
    }
  }

  const mapStateToProps = state => ({
    currentId: currentIdSelector(state),
  })

  const mapDispatchToProps = (dispatch) => {
    return {
      fetchDataIfNeeded: currentId => dispatch(fetchDataIfNeeded(currentId)),
    }
  }

  class FetchDataClass extends Component {
    static propTypes = {
      currentId: PropTypes.string.isRequired,
      fetchDataIfNeeded: PropTypes.func.isRequired,
    }

    componentDidMount() {
      this.props.fetchDataIfNeeded(this.props.currentId)
    }

    componentWillReceiveProps(nextProps) {
      if (this.props.currentId !== nextProps.currentId) {
        this.props.fetchDataIfNeeded(nextProps.currentId)
      }
    }

    render() {
      return <ComposedComponent {...this.props} />
    }
  }

  return connect(
    mapStateToProps,
    mapDispatchToProps,
  )(FetchDataClass)
}

export default FetchDataHOC
