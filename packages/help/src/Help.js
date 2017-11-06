import React, { PropTypes, Component } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { actions as helpActions, helpQuery, topResultsList } from './redux'

class Help extends Component {
  static propTypes = {}
  componentDidMount () {
    this.props.fetchHelpTopicsIfNeeded('life')
  }
  render() {
    return (
      <div>
        <div>query: {this.props.helpQuery}</div>
        <ul>
          {this.props.topResultsList.map(result => (
            <li key={result.topic}>{result.topic}: {result.description}: {result.score}</li>
          ))}
        </ul>
      </div>
    )
  }
}

export default connect(
  state => ({
    helpQuery: helpQuery(state),
    topResultsList: topResultsList(state),
  }),
  dispatch => ({
    fetchHelpTopicsIfNeeded: query => dispatch(helpActions.fetchHelpTopicsIfNeeded(query)),
  })
)(Help)
