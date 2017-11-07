import React, { PropTypes, Component } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'
import Highlighter from 'react-highlight-words'
import { actions as helpActions, topResultsList } from './redux'

const HelpContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  ${'' /* height: 100px; */}
  align-items: center;
`

const Input = styled.input`
  width: 50%;
  margin-top: 25px;
  margin-bottom: 25px;
`

const Content = styled.div`
  font-size: 14px;
  >p {
    margin-bottom: 15px;
  }
  >iframe {
    margin-top: 15px;
    margin-bottom: 15px;
  }
`

class Help extends Component {
  static propTypes = {}

  state = { searchTerm: '' }

  componentDidMount () {
    this.props.fetchHelpTopicsIfNeeded('filter', 'gnomad_help')
  }

  doSearch = debounce(() => {
    this.props.fetchHelpTopicsIfNeeded(this.state.searchTerm, 'gnomad_help')
  }, 300)

  handleSearch = (event) => { this.setState({ searchTerm: event.target.value }, () => {
    this.doSearch()
  })}

  render() {
    console.log(this.props)
    const doc = this.props.topResultsList.first() || { htmlString: '' }
    return (
      <HelpContainer>
        <Input
          type="search"
          placeholder="Search help topics"
          value={this.state.searchTerm}
          onChange={this.handleSearch}
        />
        {/* <ul>
          {this.props.topResultsList.map(result => (
            <li key={result.topic}>
              {`${result.topic} ${Math.floor((result.score * 100))}`}
            </li>
          ))}
        </ul> */}
        <Content
          dangerouslySetInnerHTML={{ __html: doc.htmlString }}
        />
      </HelpContainer>
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
