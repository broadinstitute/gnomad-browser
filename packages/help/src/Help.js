import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  actions as helpActions,
  activeHelpTopic,
  allHelpTopics,
  helpSearchResults,
  helpSearchText,
  helpTableOfContents,
  isHelpWindowOpen,
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

const HelpTopicPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
})

const Help = ({
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
    content = <Content dangerouslySetInnerHTML={{ __html: activeHelpTopic.content }} />
  } else if (helpSearchText) {
    content = (
      <TopicsWrapper>
        {helpSearchResults.map((topic, i) => (
          <HelpTopic key={topic.id}>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a
              href=""
              role="button"
              onClick={e => {
                e.preventDefault()
                setActiveHelpTopic(topic.id)
              }}
            >
              {`${i + 1}. ${topic.title}`}
            </a>
          </HelpTopic>
        ))}
      </TopicsWrapper>
    )
  } else {
    content = (
      <TopicsWrapper>
        {helpTableOfContents.sections.map(section => (
          <Section key={section.id}>
            <SectionTitle>{section.title}</SectionTitle>
            {section.children.map(id => {
              const topic = allHelpTopics[id]
              if (!topic) {
                return null
              }

              return (
                <HelpTopic key={topic.id}>
                  {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                  <a
                    href="#"
                    role="button"
                    onClick={e => {
                      e.preventDefault()
                      setActiveHelpTopic(topic.id)
                    }}
                  >
                    {topic.title}
                  </a>
                </HelpTopic>
              )
            })}
          </Section>
        ))}
      </TopicsWrapper>
    )
  }

  return (
    <HelpFloatingSection>
      <HelpContainer>
        {content}
        <FooterContainer>
          <InputContainer>
            <Input
              placeholder="Search help topics"
              type="search"
              value={helpSearchText}
              onChange={e => {
                setActiveHelpTopic(null)
                searchHelpTopics(e.target.value)
              }}
            />
          </InputContainer>
          {activeHelpTopic && (
            <BottomButton
              onClick={() => {
                setActiveHelpTopic(null)
              }}
            >
              Back
            </BottomButton>
          )}
          <BottomButton
            onClick={() => {
              toggleHelpWindow()
            }}
          >
            Close
          </BottomButton>
        </FooterContainer>
      </HelpContainer>
    </HelpFloatingSection>
  )
}

Help.propTypes = {
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

Help.defaultProps = {
  activeHelpTopic: null,
}

export default connect(
  state => ({
    activeHelpTopic: activeHelpTopic(state),
    allHelpTopics: allHelpTopics(state),
    helpSearchResults: helpSearchResults(state),
    helpSearchText: helpSearchText(state),
    helpTableOfContents: helpTableOfContents(state),
    isHelpWindowOpen: isHelpWindowOpen(state),
  }),
  helpActions
)(Help)
