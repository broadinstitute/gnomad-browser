/* eslint-disable react/prop-types */
/* eslint-disable template-curly-spacing */
import React, { PropTypes, Component } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'

import {
  actions as helpActions,
  topResultsList,
  helpWindowOpen,
  activeTopic,
  activeTopicData,
  helpQuery,
  toc,
  results,
} from './redux'

const HelpFloatingSection = styled.div`
  display: flex;
  position: fixed;
  width: 40%;
  ${'' /* height: 80%; */}
  min-height: 30%;
  max-height: 80%;
  bottom: 80px;
  right: 80px;
  z-index: 10;
  padding-left: 30px;
  padding-right: 5px;
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
  justify-content: flex-start;
  align-items: center;
  width: 90%;
  height: 50px;
`

const Input = styled.input`
  width: 90%;
  line-height: 50%;
  height: 40px;
  margin: 0;
  font-size: 14px;
  padding-left: 10px;
  border: 1px solid lightgrey;
`

const Content = styled.div`
  font-size: 14px;
  overflow-y: auto;
  padding-right: 25px;

  h1, h2, h3 {
    font-weight: bold;
  }

  h1 {
    font-size: 28px;
  }

  h2 {
    font-size: 20px;
  }

  p {
    line-height: 150%;
    margin-bottom: 15px;
    margin-top: 15px;
    a {
      text-decoration: none;
      color: #428bca;
    }
  }

  iframe {
    margin-top: 15px;
    margin-bottom: 15px;
  }

  blockquote {
    margin: 0 0 0 0;
    line-height: 150%;
    font-style: italic;
    margin-left: 10px;
    font-size: 14px;
  }

  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding-left: 1.3em;
    padding-bottom: 3px;
    padding-top: 3px;
  }
  li:before {
    content: "\f192"; /* FontAwesome Unicode */
    font-family: FontAwesome;
    display: inline-block;
    margin-left: -1.3em; /* same as padding-left set on li */
    width: 1.3em; /* same as padding-left set on li */
  }
`

const TopicsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  width: 100%;
  height: 100%;
`

const HelpTopic = styled.div`
  margin-top: 10px;
  font-size: 16px;
  >a {
    text-decoration: none;
    color: #428bca;
    font-weight: light;
  }
`

const FooterContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  height: 50px;
  width: 100%;
  margin-top: 10px;
  ${'' /* border: 1px solid #000; */}
`

const BottomButton = styled.button`
  border: 0;
  background-color: #F0F0F0 ;
  border-radius: 5px;
  width: 20%;
  height: 100%;
  border: 1px solid lightgrey;
  margin-right: 10px;
  &:hover {
    background-color: lightgrey;
    cursor: pointer;
  }
`

const Section = styled.div`
  margin-bottom: 20px;
`
const SectionTitle = styled.h1`
  font-weight: bold;
  font-size: 18px;
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
      this.props.setHelpQuery(this.state.searchTerm)
    } else {
      this.props.setActiveTopic(null)
      this.props.setHelpQuery(this.state.searchTerm)
      this.props.fetchHelpTopicsIfNeeded(this.state.searchTerm, 'gnomad_help')
    }
  }, 300)

  handleSearch = (event) => { this.setState({ searchTerm: event.target.value }, () => {
    this.doSearch()
  })}

  render() {
    return (
      this.props.helpWindowOpen ?
        <HelpFloatingSection>
          <HelpContainer>
            {this.props.activeTopic ?  // eslint-disable-line
              (<Content
                dangerouslySetInnerHTML={{ __html: this.props.activeTopicData.htmlString }}
              />) :
              this.props.helpQuery === '' ?
                (
                  <TopicsWrapper>
                    {this.props.toc.sections.map((section) => {
                      return (
                        <Section key={`${section.id}`}>
                          <SectionTitle>{section.title}</SectionTitle>
                          {section.children.map((id) => {  // eslint-disable-line
                            const topic = this.props.results.get(id)
                            if (!topic) return  // eslint-disable-line
                            return (  // eslint-disable-line
                              <HelpTopic key={topic.id}>
                                <a
                                  href=""
                                  onClick={(event) => {
                                    event.preventDefault()
                                    this.props.setActiveTopic(topic.id)
                                  }}
                                >
                                  {topic.title}
                                </a>
                              </HelpTopic>
                            )
                          })}
                        </Section>
                      )
                    })}
                  </TopicsWrapper>
                ) :
                (
                  <TopicsWrapper>
                    {this.props.topResultsList.map((topic, i) => (
                      <HelpTopic key={topic.id}>
                        <a
                          href=""
                          onClick={(event) => {
                            event.preventDefault()
                            this.props.setActiveTopic(topic.id)
                          }}
                        >
                          {`${i + 1}. ${topic.title}`}
                        </a>
                      </HelpTopic>
                    ))}
                  </TopicsWrapper>
                )}
            <FooterContainer>
              <InputContainer>
                <Input
                  type="search"
                  placeholder="Search help topics"
                  value={this.state.searchTerm}
                  onChange={this.handleSearch}
                />
              </InputContainer>
              {this.props.activeTopic &&
                <BottomButton
                  onClick={(event) => {
                    event.preventDefault()
                    this.props.setActiveTopic(null)
                  }}
                >
                  Back
                </BottomButton>}

              <BottomButton
                onClick={(event) => {
                  event.preventDefault()
                  this.props.toggleHelpWindow()
                }}
              >
                Close
              </BottomButton>
            </FooterContainer>
          </HelpContainer>
        </HelpFloatingSection> : <div />
    )
  }
}

export default connect(
  state => ({
    topResultsList: topResultsList(state),
    results: results(state),
    helpWindowOpen: helpWindowOpen(state),
    activeTopic: activeTopic(state),
    activeTopicData: activeTopicData(state),
    helpQuery: helpQuery(state),
    toc: toc(state),
  }),
  helpActions
)(Help)
