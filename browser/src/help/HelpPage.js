import SearchApi, { INDEX_MODES } from 'js-worker-search'
import { hideVisually } from 'polished'
import React from 'react'
import { useHistory } from 'react-router-dom'
import styled from 'styled-components'

import { Button, Link as BaseLink, List, ListItem, PageHeading, Searchbox } from '@gnomad/ui'

import tableOfContents from '../../help/helpPageTableOfContents.json'

import { withAnchor } from '../AnchorLink'
import DocumentTitle from '../DocumentTitle'
import Link from '../Link'

import helpTopics, { indexTexts } from './helpTopics' // eslint-disable-line import/no-unresolved,import/extensions
import slugify from './slugify'

export const SectionHeading = withAnchor(styled.h2``)
export const SectionSubheading = withAnchor(styled.h3`
  margin-bottom: 0.5em;
`)

const searchApi = new SearchApi({
  indexMode: INDEX_MODES.PREFIXES,
})

indexTexts.forEach(({ id, texts }) => {
  texts.forEach(text => {
    searchApi.indexDocument(id, text)
  })
})

const HelpPageWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 1500px;
  padding-right: 240px; /* balance navigation */
  margin: 0 auto 40px;
`

const HelpNavigation = styled.section`
  position: sticky;
  top: 0;
  flex-shrink: 0;
  box-sizing: border-box;
  width: 240px;
  height: 100%;
  padding: 15px;

  ul {
    padding-left: 20px;
    line-height: 1.5;

    ul {
      margin: 0.5em 0;
    }
  }

  @media (max-width: 1000px) {
    display: none;
  }
`

const HelpContentWrapper = styled.div`
  flex-grow: 1;
  overflow: auto;
  box-sizing: border-box;
  width: 100%;
  padding: 0 15px;
`

const HelpContent = styled.div`
  font-size: 16px;

  p {
    margin-bottom: 1em;
    line-height: 1.4;
  }
`

const FAQList = styled.ul`
  padding-left: 0;
  list-style-type: none;
  margin-bottom: 1em;

  summary {
    padding: 0.25em;
    cursor: pointer;

    h4 {
      display: inline;
      font-weight: normal;
    }
  }

  details[open] {
    summary {
      h4 {
        font-weight: bold;
      }
    }
  }
`

const FAQAnswer = styled.div`
  padding-left: 10px;
  border-left: 1px solid #999;
`

const ToggleButton = styled(Button)`
  font-size: 12px;
`

const HelpPage = () => {
  const history = useHistory()

  return (
    <HelpPageWrapper>
      <DocumentTitle title="Help" />

      <HelpNavigation>
        <h2>Table of contents</h2>
        <ul>
          <li>
            <BaseLink href="#search">Search</BaseLink>
          </li>
          {tableOfContents.topics.map(topicId => (
            <li key={topicId}>
              <Link to={`/help/${topicId}`}>{helpTopics[topicId].title}</Link>
            </li>
          ))}
          <li>
            <BaseLink href="#frequently-asked-questions">Frequently asked questions</BaseLink>
            <ul>
              {tableOfContents.faq.map(section => (
                <li key={section.heading}>
                  <BaseLink href={`#${slugify(section.heading)}`}>{section.heading}</BaseLink>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </HelpNavigation>

      <HelpContentWrapper>
        <PageHeading>gnomAD Help</PageHeading>
        <HelpContent>
          <section id="search">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="help-search" style={hideVisually()}>
              Search gnomAD help
            </label>

            <Searchbox
              width="100%"
              fetchSearchResults={query =>
                searchApi.search(query).then(results =>
                  results.map(topicId => ({
                    label: helpTopics[topicId].title,
                    value: topicId,
                  }))
                )
              }
              id="help-search"
              placeholder="Search"
              onSelect={topicId => {
                history.push(`/help/${topicId}`)
              }}
            />
          </section>

          <section>
            <List>
              {tableOfContents.topics.map(topicId => (
                <ListItem key={topicId}>
                  <Link to={`/help/${topicId}`}>{helpTopics[topicId].title}</Link>
                </ListItem>
              ))}
            </List>
          </section>

          <section>
            <SectionHeading id="frequently-asked-questions">
              Frequently asked questions
            </SectionHeading>
            {tableOfContents.faq.map(section => (
              <div key={section.heading}>
                <SectionSubheading id={slugify(section.heading)}>
                  {section.heading}
                </SectionSubheading>
                <ToggleButton
                  onClick={e => {
                    Array.from(e.target.parentElement.querySelectorAll('details')).forEach(el => {
                      el.open = true // eslint-disable-line no-param-reassign
                    })
                  }}
                >
                  Show all answers in this section
                </ToggleButton>{' '}
                <ToggleButton
                  onClick={e => {
                    Array.from(e.target.parentElement.querySelectorAll('details')).forEach(el => {
                      el.open = false // eslint-disable-line no-param-reassign
                    })
                  }}
                >
                  Hide all answers in this section
                </ToggleButton>
                <FAQList>
                  {section.topics.map(topicId => (
                    <li key={topicId}>
                      <details>
                        <summary>
                          <h4>{helpTopics[topicId].title}</h4>
                        </summary>
                        <FAQAnswer>{helpTopics[topicId].render()}</FAQAnswer>
                      </details>
                    </li>
                  ))}
                </FAQList>
              </div>
            ))}
          </section>
        </HelpContent>
      </HelpContentWrapper>
    </HelpPageWrapper>
  )
}

export default HelpPage
