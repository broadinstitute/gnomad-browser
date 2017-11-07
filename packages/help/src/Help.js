import React, { PropTypes, Component } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'
import Highlighter from 'react-highlight-words'
import { actions as helpActions, topResultsList } from './redux'

class Help extends Component {
  static propTypes = {}

  state = { searchTerm: '' }

  componentDidMount () {
    this.props.fetchHelpTopicsIfNeeded('filter', 'gnomad_help')
  }

  doSearch = debounce(() => {
    console.log(this.state.searchTerm)
    this.props.fetchHelpTopicsIfNeeded(this.state.searchTerm, 'gnomad_help')
  }, 300)

  handleSearch = (event) => { this.setState({ searchTerm: event.target.value }, () => {
    this.doSearch()
  })}

  render() {
    console.log(this.props)
    return (
      <div>
        <input
          type="search"
          placeholder="Search help topics"
          value={this.state.searchTerm}
          onChange={this.handleSearch}
        />
        <ul>
          {this.props.topResultsList.map(result => (
            <li key={result.topic}>
              Relevance score: {Math.floor((result.score * 100))}
              <div dangerouslySetInnerHTML={{ __html: result.htmlString }} />
              <hr/>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

export default connect(
  state => ({
    topResultsList: topResultsList(state),
  }),
  dispatch => ({
    fetchHelpTopicsIfNeeded: query => dispatch(helpActions.fetchHelpTopicsIfNeeded(query)),
  })
)(Help)
