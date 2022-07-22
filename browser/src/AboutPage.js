import React from 'react'
import styled from 'styled-components'
import { PageHeading } from '@gnomad/ui'

import aboutContent from '../about/about.md'
import contributingProjectsList from '../about/contributors/contributing-projects.md'
import fundingSources from '../about/contributors/funding.md'
import dataContributorsList from '../about/contributors/data-contributors.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const Credits = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 992px) {
    flex-direction: column;
    font-size: 16px;
  }
`

const SectionHeader = styled.h2`
  padding-top: 2rem;
  margin-top: 2rem;
`

const CreditsSection = styled.div`
  width: calc(${props => props.width} - 15px);

  @media (max-width: 992px) {
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

const PrincipalInvestigators = styled(Contributors)`
  columns: 2;

  @media (max-width: 992px) {
    columns: 1;
  }
`

const FundingSources = styled(Contributors)`
  li {
    margin-bottom: 1rem;
  }
`

export default () => (
  <InfoPage>
    <DocumentTitle title="About gnomAD" />
    <PageHeading id="about-gnomad">About gnomAD</PageHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: aboutContent.html }} />

    <SectionHeader>Funding</SectionHeader>
    <CreditsSection width="70%">
      <FundingSources
        aria-labelledby="funding"
        dangerouslySetInnerHTML={{ __html: fundingSources.html }}
      />
      <p>
        The vast majority of the data storage, computing resources, and human effort used to
        generate this call set were donated by the Broad Institute
      </p>
    </CreditsSection>

    <SectionHeader>Data Contributors</SectionHeader>
    <Credits>
      <CreditsSection width="45%">
        <h3 id="principal-investigators">Data Contributors</h3>
        <PrincipalInvestigators
          aria-labelledby="principal-investigators"
          dangerouslySetInnerHTML={{ __html: dataContributorsList.html }}
        />
      </CreditsSection>
      <CreditsSection width="45%">
        <h3 id="contributing-projects">Contributing projects</h3>
        <Contributors
          aria-labelledby="contributing-projects"
          dangerouslySetInnerHTML={{ __html: contributingProjectsList.html }}
        />
      </CreditsSection>
    </Credits>
  </InfoPage>
)
