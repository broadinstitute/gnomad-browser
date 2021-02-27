import SearchApi, { INDEX_MODES } from 'js-worker-search'
import debounce from 'lodash.debounce'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Button, Modal, TextButton } from '@gnomad/ui'

import MarkdownContent from '../MarkdownContent'

import helpState from './helpState'
import helpTopics from './helpTopics' // eslint-disable-line import/no-unresolved,import/extensions
import toc from './toc.json'

const HelpContainer = styled.div`
  overflow-y: auto;

  /* Leave space for modal margins, header and footer */
  height: calc(100vh - 210px);
  min-height: 400px;
  font-size: 16px;
`

const TopicsList = styled.ol`
  padding-left: 30px;

  li {
    margin-bottom: 0.5em;
  }

  button {
    text-align: left;
  }
`

const SearchInput = styled.input.attrs({ type: 'search' })`
  flex-grow: 1;
  box-sizing: border-box;
  min-width: 80px;
  padding: 0.375em 0.75em;
  border: 1px solid #6c757d;
  border-radius: 0.25em;
  appearance: none;
  background: none;

  &:focus {
    outline: none;
    border-color: rgb(70, 130, 180);
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`

const FooterWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;

  button {
    margin-left: 1em;
  }
`

const searchApi = new SearchApi({
  indexMode: INDEX_MODES.PREFIXES,
})

Object.values(helpTopics).forEach(topic => {
  searchApi.indexDocument(topic.id, topic.title)
  searchApi.indexDocument(topic.id, topic.html)
})

class HelpModal extends Component {
  state = {
    isOpen: false,
    selectedTopic: null,
    searchText: '',
    searchResults: [],
  }

  searchHelpTopics = debounce(query => {
    searchApi.search(query).then(searchResults => {
      this.setState({ searchResults })
    })
  }, 300)

  componentDidMount() {
    helpState.subscribe('change', this.onStateChange)
  }

  componentWillUnmount() {
    helpState.unsubscribe('change', this.onStateChange)
  }

  onStateChange = state => {
    this.setState(state)
  }

  renderContent() {
    const { selectedTopic, searchText, searchResults } = this.state

    if (selectedTopic) {
      const topic = helpTopics[selectedTopic.toLowerCase()]
      if (!topic) {
        return null
      }
      return <MarkdownContent dangerouslySetInnerHTML={{ __html: topic.html }} />
    }

    if (searchText) {
      return (
        <TopicsList>
          {searchResults.map(topicId => (
            <li key={topicId}>
              <TextButton
                onClick={() => {
                  helpState.set({ selectedTopic: topicId })
                }}
              >
                {helpTopics[topicId.toLowerCase()].title}
              </TextButton>
            </li>
          ))}
        </TopicsList>
      )
    }

    return (
      <div>
        {toc.sections.map(section => (
          <React.Fragment key={section.id}>
            <h3>{section.title}</h3>
            <TopicsList>
              {section.children.map(id => {
                const topic = helpTopics[id.toLowerCase()]
                if (!topic) {
                  return null
                }

                return (
                  <li key={topic.id}>
                    <TextButton
                      onClick={() => {
                        helpState.set({ selectedTopic: topic.id })
                      }}
                    >
                      {topic.title}
                    </TextButton>
                  </li>
                )
              })}
            </TopicsList>
          </React.Fragment>
        ))}
      </div>
    )
  }

  renderFooter() {
    const { selectedTopic, searchText } = this.state
    return (
      <FooterWrapper>
        <SearchInput
          placeholder="Search help topics"
          value={searchText}
          onChange={e => {
            helpState.set({ selectedTopic: null })
            this.setState({ searchText: e.target.value })
            if (e.target.value) {
              this.searchHelpTopics(e.target.value)
            } else {
              this.setState({ searchResults: [] })
            }
          }}
        />
        {selectedTopic && (
          <Button
            onClick={() => {
              helpState.set({ selectedTopic: null })
            }}
          >
            Back
          </Button>
        )}
        <Button
          onClick={() => {
            const { isOpen } = this.state
            helpState.set({ isOpen: !isOpen })
          }}
        >
          Close
        </Button>
      </FooterWrapper>
    )
  }

  render() {
    const { isOpen } = this.state
    if (!isOpen) {
      return null
    }

    return (
      <Modal
        footer={this.renderFooter()}
        size="large"
        title="gnomAD help"
        onRequestClose={() => {
          helpState.set({ isOpen: false })
        }}
      >
        <HelpContainer>{this.renderContent()}</HelpContainer>
      </Modal>
    )
  }
}

export default HelpModal
