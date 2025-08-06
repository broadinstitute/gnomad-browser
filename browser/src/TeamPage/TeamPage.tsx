import React from 'react'
import styled from 'styled-components'
import { PageHeading } from '@gnomad/ui'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import dataGenerationContributors from '../../about/contributors/data-generation.md'
import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'

const Team = styled.div`
  padding-bottom: 1rem;
`
const TeamSection = styled.div`
  padding-bottom: 1rem;
  margin-bottom: 1rem;
`
const TeamSectionList = styled.div`
  display: flex;
  flex-direction: column;
  align-items: left;
  width: 100%;
  padding: 1rem;
  margin: 1rem auto;
`

const ColumnList = styled.div`
  content: '';
  display: table;
  width: 100%;
  clear: both;
`
const ResponsiveColumn = styled.div`
  float: left;
  width: 33.33%;

  @media screen and (max-width: 600px) {
    width: 100%;
  }
`

const Contributors = styled.div`
  line-height: 1.5;

  ul {
    padding-left: 0;
    margin: 0;
    list-style-type: none;
  }

  ul ul {
    padding-left: 20px;
    margin: 0.5em 0;
  }
`

const TeamPage = () => {
  return (
    <InfoPage>
      <DocumentTitle title="The Team" />
      {/* // @ts-expect-error */}
      <PageHeading
        // @ts-expect-error
        id="the-ourdna-browser-team"
      >
        The OurDNA Browser Team
      </PageHeading>
      <Team>
        <TeamSection>
          <TeamSectionList>
            <ColumnList>
              <ResponsiveColumn>
                <Contributors
                  aria-labelledby="data-generation-contributors"
                  dangerouslySetInnerHTML={{ __html: dataGenerationContributors.html }}
                />
              </ResponsiveColumn>
            </ColumnList>
          </TeamSectionList>
        </TeamSection>
      </Team>
    </InfoPage>
  )
}

export default TeamPage
