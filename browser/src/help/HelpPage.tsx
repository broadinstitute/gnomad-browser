import SearchApi, { INDEX_MODES } from 'js-worker-search'
import { hideVisually } from 'polished'
import React from 'react'
import { useHistory } from 'react-router-dom'
import styled from 'styled-components'

import { Button, Link as BaseLink, List, ListItem, PageHeading, Searchbox } from '@gnomad/ui'

// @ts-expect-error TS(2732) FIXME: Cannot find module '../../help/helpPageTableOfCont... Remove this comment to see the full error message
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

indexTexts.forEach(({ id, texts }: any) => {
  texts.forEach((text: any) => {
    searchApi.indexDocument(id, text)
  })
})

const HelpPageWrapper = styled.div`
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  width: 100%;
  max-width: 1680px;
  padding-right: 240px; /* balance navigation */
  margin: 0 auto 40px;

  @media (max-width: 1280px) {
    padding-right: 0;
  }
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
            {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <BaseLink href="#search">Search</BaseLink>
          </li>
          {tableOfContents.topics.map((topicId: any) => (
            <li key={topicId}>
              {/* @ts-expect-error TS(2786) FIXME: 'Link' cannot be used as a JSX component. */}
              <Link to={`/help/${topicId}`}>{helpTopics[topicId].title}</Link>
            </li>
          ))}
          <li>
            {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <BaseLink href="#frequently-asked-questions">Frequently asked questions</BaseLink>
            <ul>
              {tableOfContents.faq.map((section: any) => (
                <li key={section.heading}>
                  {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
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
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              width="100%"
              fetchSearchResults={(query) =>
                searchApi.search(query).then((results: any) =>
                  results.map((topicId: any) => ({
                    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    label: helpTopics[topicId].title,
                    value: topicId,
                  }))
                )
              }
              id="help-search"
              placeholder="Search"
              onSelect={(topicId) => {
                history.push(`/help/${topicId}`)
              }}
            />
          </section>

          <section>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <List>
              {tableOfContents.topics.map((topicId: any) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={topicId}>
                  {/* @ts-expect-error TS(2786) FIXME: 'Link' cannot be used as a JSX component. */}
                  <Link to={`/help/${topicId}`}>{helpTopics[topicId].title}</Link>
                </ListItem>
              ))}
            </List>
          </section>

          <section>
            <SectionHeading id="frequently-asked-questions">
              Frequently asked questions
            </SectionHeading>
            {tableOfContents.faq.map((section: any) => (
              <div key={section.heading}>
                <SectionSubheading id={slugify(section.heading)}>
                  {section.heading}
                </SectionSubheading>
                <ToggleButton
                  onClick={(e: any) => {
                    Array.from(e.target.parentElement.querySelectorAll('details')).forEach(
                      (el: any) => {
                        el.open = true // eslint-disable-line no-param-reassign
                      }
                    )
                  }}
                >
                  Show all answers in this section
                </ToggleButton>{' '}
                <ToggleButton
                  onClick={(e: any) => {
                    Array.from(e.target.parentElement.querySelectorAll('details')).forEach(
                      (el: any) => {
                        el.open = false // eslint-disable-line no-param-reassign
                      }
                    )
                  }}
                >
                  Hide all answers in this section
                </ToggleButton>
                <FAQList>
                  {section.topics.map((topicId: any) => (
                    <li key={topicId}>
                      <details>
                        <summary>
                          {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
                          <h4>{helpTopics[topicId].title}</h4>
                        </summary>
                        {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
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
