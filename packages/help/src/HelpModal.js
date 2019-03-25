import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { Button, Modal, TextButton } from '@broad/ui'

import { HelpContent } from './HelpContent'
import {
  actions as helpActions,
  activeHelpTopic,
  allHelpTopics,
  helpSearchResults,
  helpSearchText,
  helpTableOfContents,
  isHelpWindowOpen,
} from './redux'

const HelpContainer = styled.div`
  overflow-y: auto;

  /* Leave space for modal margins, header and footer */
  height: calc(100vh - 210px);
  min-height: 400px;
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

const HelpTopicPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
})

const HelpModal = ({
  /* eslint-disable no-shadow */
  activeHelpTopic,
  allHelpTopics,
  helpSearchResults,
  helpSearchText,
  helpTableOfContents,
  isHelpWindowOpen,
  /* eslint-enable no-shadow */
  searchHelpTopics,
  setActiveHelpTopic,
  toggleHelpWindow,
}) => {
  if (!isHelpWindowOpen) {
    return null
  }

  let content
  if (activeHelpTopic) {
    content = <HelpContent dangerouslySetInnerHTML={{ __html: activeHelpTopic.content }} />
  } else if (helpSearchText) {
    content = (
      <TopicsList>
        {helpSearchResults.map(topic => (
          <li key={topic.id}>
            <TextButton
              onClick={() => {
                setActiveHelpTopic(topic.id)
              }}
            >
              {topic.title}
            </TextButton>
          </li>
        ))}
      </TopicsList>
    )
  } else {
    content = (
      <div>
        {helpTableOfContents.sections.map(section => (
          <React.Fragment key={section.id}>
            <h3>{section.title}</h3>
            <TopicsList>
              {section.children.map(id => {
                const topic = allHelpTopics[id]
                if (!topic) {
                  return null
                }

                return (
                  <li key={topic.id}>
                    <TextButton
                      onClick={() => {
                        setActiveHelpTopic(topic.id)
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

  const footer = (
    <FooterWrapper>
      <SearchInput
        placeholder="Search help topics"
        value={helpSearchText}
        onChange={e => {
          setActiveHelpTopic(null)
          searchHelpTopics(e.target.value)
        }}
      />
      {activeHelpTopic && (
        <Button
          onClick={() => {
            setActiveHelpTopic(null)
          }}
        >
          Back
        </Button>
      )}
      <Button
        onClick={() => {
          toggleHelpWindow()
        }}
      >
        Close
      </Button>
    </FooterWrapper>
  )

  return (
    <Modal
      footer={footer}
      size="large"
      title="gnomAD help"
      onRequestClose={() => {
        toggleHelpWindow()
      }}
    >
      <HelpContainer>{content}</HelpContainer>
    </Modal>
  )
}

HelpModal.propTypes = {
  activeHelpTopic: HelpTopicPropType,
  allHelpTopics: PropTypes.objectOf(HelpTopicPropType).isRequired,
  helpSearchResults: PropTypes.arrayOf(HelpTopicPropType).isRequired,
  helpSearchText: PropTypes.string.isRequired,
  helpTableOfContents: PropTypes.shape({
    sections: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        children: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ),
  }).isRequired,
  isHelpWindowOpen: PropTypes.bool.isRequired,
  searchHelpTopics: PropTypes.func.isRequired,
  setActiveHelpTopic: PropTypes.func.isRequired,
  toggleHelpWindow: PropTypes.func.isRequired,
}

HelpModal.defaultProps = {
  activeHelpTopic: null,
}

export const ConnectedHelpModal = connect(
  state => ({
    activeHelpTopic: activeHelpTopic(state),
    allHelpTopics: allHelpTopics(state),
    helpSearchResults: helpSearchResults(state),
    helpSearchText: helpSearchText(state),
    helpTableOfContents: helpTableOfContents(state),
    isHelpWindowOpen: isHelpWindowOpen(state),
  }),
  helpActions
)(HelpModal)
