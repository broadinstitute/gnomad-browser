import React, { PropTypes, Component } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'
import Highlighter from 'react-highlight-words'

import {
  actions as helpActions,
  topResultsList,
  helpWindowOpen,
  activeTopic,
  activeTopicData,
  helpQuery,
} from './redux'

const HelpFloatingSection = styled.div`
  display: flex;
  position: fixed;
  width: 30%;
  ${'' /* height: 80%; */}
  min-height: 30%;
  bottom: 80px;
  right: 80px;
  z-index: 10;
  padding-left: 30px;
  padding-right: 30px;
  background-color: #FAFAFA;
  border-radius: 8px;
  border: 1px solid lightgray;
  box-shadow: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
  padding-top: 30px;
  padding-bottom: 30px;
`

const HelpContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  ${'' /* border: 1px solid #000; */}
  justify-content: space-between;
  ${'' /* align-items: center; */}
`

const InputContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start|flex-end|center|baseline|stretch;
  width: 100%;
  height: 50px;
  margin-bottom: 20px;
`

const Input = styled.input`
  width: 100%;
  line-height: 50%;
  height: 100%;
  margin: 0;
  font-size: 14px;
  padding-left: 10px;
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

const SearchResultsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  ${'' /* border: 1px solid #000; */}
  width: 100%;
  height: 100%;
`

const SearchResult = styled.div`
  margin-top: 10px;
  font-size: 16px;
  >a {
    text-decoration: none;
    color: #428bca;
  }
`

const FooterContainer = styled.div`all
  display: flex;
  flex-direction: row;
  height: 50px;
  width: 100%;
  ${'' /* border: 1px solid #000; */}
`

const BackButton = styled.button`
  border: 0;
  background-color: #F0F0F0 ;
  border-radius: 5px;
  width: 20%;
  height: 100%;
  &:hover {
    background-color: lightgrey;
    cursor: pointer;
  }
`

class Help extends Component {
  static propTypes = {}

  state = { searchTerm: '' }

  componentDidMount () {
    this.props.fetchDefaultHelpTopics(this.props.index)
  }

  doSearch = debounce(() => {
    if (this.state.searchTerm === '') {
      this.props.fetchDefaultHelpTopics(this.props.index)
    } else {
      this.props.setActiveTopic(null)
      this.props.fetchHelpTopicsIfNeeded(this.state.searchTerm, 'gnomad_help')
    }
  }, 300)

  handleSearch = (event) => { this.setState({ searchTerm: event.target.value }, () => {
    this.doSearch()
  })}

  render() {
    console.log(this.props)
    return (
      this.props.helpWindowOpen ?
        <HelpFloatingSection>
          <HelpContainer>
            <InputContainer>
              <Input
                type="search"
                placeholder="Search help topics"
                value={this.state.searchTerm}
                onChange={this.handleSearch}
              />
            </InputContainer>
            {this.props.activeTopic ?
              <Content
                dangerouslySetInnerHTML={{ __html: this.props.activeTopicData.htmlString }}
              /> :
              <SearchResultsWrapper>
                {this.props.topResultsList.map((result, i) => (
                  <SearchResult key={result.topic}>
                    <a
                      href=""
                      onClick={(event) => {
                        event.preventDefault()
                        this.props.setActiveTopic(result.topic)
                      }}
                    >
                      {`${i + 1}. ${result.topic}`}
                    </a>
                    {/* {`${result.topic} ${Math.floor((result.score * 100))}`} */}
                  </SearchResult>
                ))}
              </SearchResultsWrapper>}
            <FooterContainer>
              {this.props.activeTopic &&
                <BackButton
                  onClick={(event) => {
                    event.preventDefault()
                    this.props.setActiveTopic(null)
                  }}
                >
                  Back
                </BackButton>}
            </FooterContainer>
          </HelpContainer>
        </HelpFloatingSection> : <div />
    )
  }
}

export default connect(
  state => ({
    topResultsList: topResultsList(state),
    helpWindowOpen: helpWindowOpen(state),
    activeTopic: activeTopic(state),
    activeTopicData: activeTopicData(state),
    helpQuery: helpQuery(state),
  }),
  helpActions
)(Help)
