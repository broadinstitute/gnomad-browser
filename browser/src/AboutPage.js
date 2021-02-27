import React from 'react'
import styled from 'styled-components'
import { PageHeading } from '@gnomad/ui'

import aboutContent from '../about/about.md'
import broadGenomicsPlatformTeam from '../about/contributors/broad-genomics-platform.md'
import contributingProjectsList from '../about/contributors/contributing-projects.md'
import coordinationTeam from '../about/contributors/coordination.md'
import dataGenerationTeam from '../about/contributors/data-generation.md'
import ethicsTeam from '../about/contributors/ethics.md'
import fundingSources from '../about/contributors/funding.md'
import mitochondrialVariationTeam from '../about/contributors/mitochondrial-variation.md'
import principalInvestigatorsList from '../about/contributors/principal-investigators.md'
import productionAndAnalysisTeam from '../about/contributors/production-and-analysis.md'
import steeringCommittee from '../about/contributors/steering-committee.md'
import structuralVariationTeam from '../about/contributors/structural-variation.md'
import websiteTeam from '../about/contributors/website.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const Credits = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-size: 13px;

  @media (max-width: 992px) {
    flex-direction: column;
    font-size: 16px;
  }
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
    margin-bottom: 1em;
  }
`

export default () => (
  <InfoPage>
    <DocumentTitle title="About gnomAD" />
    <PageHeading id="about-gnomad">About gnomAD</PageHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: aboutContent.html }} />

    <Credits>
      <CreditsSection width="34%">
        <h3 id="principal-investigators">Principal Investigators</h3>
        <PrincipalInvestigators
          aria-labelledby="principal-investigators"
          dangerouslySetInnerHTML={{ __html: principalInvestigatorsList.html }}
        />
      </CreditsSection>
      <CreditsSection width="30%">
        <h3 id="contributing-projects">Contributing projects</h3>
        <Contributors
          aria-labelledby="contributing-projects"
          dangerouslySetInnerHTML={{ __html: contributingProjectsList.html }}
        />
      </CreditsSection>
      <CreditsSection width="18%">
        <h3 id="data-generation-contributors">Data generation</h3>
        <Contributors
          aria-labelledby="data-generation-contributors"
          dangerouslySetInnerHTML={{ __html: dataGenerationTeam.html }}
        />
        <h3 id="structural-variation-contributors">Structural variation</h3>
        <Contributors
          aria-labelledby="structural-variation-contributors"
          dangerouslySetInnerHTML={{ __html: structuralVariationTeam.html }}
        />
        <h3 id="mitochondrial-variation-contributors">Mitochondrial variation</h3>
        <Contributors
          aria-labelledby="mitochondrial-variation-contributors"
          dangerouslySetInnerHTML={{ __html: mitochondrialVariationTeam.html }}
        />
        <h3 id="broad-genomics-platform">Broad Genomics Platform</h3>
        <Contributors
          aria-labelledby="broad-genomics-platform"
          dangerouslySetInnerHTML={{ __html: broadGenomicsPlatformTeam.html }}
        />
        <h3 id="ethics-contributors">Ethics</h3>
        <Contributors
          aria-labelledby="ethics-contributors"
          dangerouslySetInnerHTML={{ __html: ethicsTeam.html }}
        />
      </CreditsSection>
      <CreditsSection width="18%">
        <h3 id="production-and-analysis-contributors">Production and analysis</h3>
        <Contributors
          aria-labelledby="production-and-analysis-contributors"
          dangerouslySetInnerHTML={{ __html: productionAndAnalysisTeam.html }}
        />
        <h3 id="coordination-contributors">Coordination</h3>
        <Contributors
          aria-labelledby="coordination-contributors"
          dangerouslySetInnerHTML={{ __html: coordinationTeam.html }}
        />
        <h3 id="website-contributors">Website</h3>
        <Contributors
          aria-labelledby="website-contributors"
          dangerouslySetInnerHTML={{ __html: websiteTeam.html }}
        />
        <h3 id="steering-committee">Steering Committee</h3>
        <Contributors
          aria-labelledby="steering-committee"
          dangerouslySetInnerHTML={{ __html: steeringCommittee.html }}
        />

        <h3 id="funding">Funding</h3>
        <FundingSources
          aria-labelledby="funding"
          dangerouslySetInnerHTML={{ __html: fundingSources.html }}
        />

        <p>
          The vast majority of the data storage, computing resources, and human effort used to
          generate this call set were donated by the Broad Institute
        </p>
      </CreditsSection>
    </Credits>
  </InfoPage>
)
