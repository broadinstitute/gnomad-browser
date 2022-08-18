import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { PageHeading } from '@gnomad/ui'

// JSON containing information for all members with bios and headshots
import teamMembers from './TeamMembers.json'

// use Webpack Context to dynamically import all headshots
import headshotImages from './headshotLoader'

// Members of the "Staff" section
// @ts-expect-error
import websiteStaff from '../../about/contributors/website.md'
// @ts-expect-error
import productionStaff from '../../about/contributors/production.md'
// @ts-expect-error
import operationsStaff from '../../about/contributors/operations.md'

// Members of the "Contributors" section
// @ts-expect-error
import dataGenerationContributors from '../../about/contributors/data-generation.md'
// @ts-expect-error
import productionAndAnalysisContributors from '../../about/contributors/production-and-analysis.md'
// @ts-expect-error
import structuralVariantsContributors from '../../about/contributors/structural-variation.md'
// @ts-expect-error
import mitochondrialVariantsContributors from '../../about/contributors/mitochondrial-variation.md'
// @ts-expect-error
import broadGenomicsPlatformContributors from '../../about/contributors/broad-genomics-platform.md'
// @ts-expect-error
import ethicsContributors from '../../about/contributors/ethics.md'

// Members of the 'Alumni' Section
// @ts-expect-error
import alumni from '../../about/contributors/alumni.md'

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
  align-items: center;
  width: 80%;
  padding: 1rem;
  margin: 1rem auto;
`

// Used for a responsive 3 column layout for contributors
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

// Component to be used for a TeamCard, only used on this page
// @ts-expect-error
const TeamCard = ({ title, description, headshotSource }) => {
  return (
    <TeamHeadshotAndDescription>
      <Row>
        <ImageColumn>
          <Headshot
            alt={`Headshot of ${title}`}
            src={
              // @ts-expect-error
              headshotImages[headshotSource]
            }
          />
        </ImageColumn>
        <TextColumn>
          <TextTitle>{title} </TextTitle>
          <TextBlurb>{description}</TextBlurb>
        </TextColumn>
      </Row>
    </TeamHeadshotAndDescription>
  )
}

TeamCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  headshotSource: PropTypes.string.isRequired,
}

const TeamHeadshotAndDescription = styled.div`
  padding-bottom: 2rem;
`

const Row = styled.div`
  display: flex;
`

const ImageColumn = styled.div`
  padding-right: 0.5rem;
`

const Headshot = styled.img`
  width: 12rem;
`

const TextColumn = styled.div`
  padding-left: 2rem;
  line-height: 1.5;
`

const TextTitle = styled.span`
  font-weight: bold;
`

const TextBlurb = styled.span`
  margin-top: 1rem;
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

export default () => (
  <InfoPage>
    <DocumentTitle title="The gnomAD Team" />
    {/* // @ts-expect-error */}
    <PageHeading
      // @ts-expect-error
      id="the-gnomad-team"
    >
      The gnomAD Team
    </PageHeading>
    <Team>
      <TeamSection>
        <h2>gnomAD Steering Committee</h2>
        <p>
          The gnomAD Steering Committee (SC) consists of investigators with expertise in genomic
          sequencing, computational analysis, and rare disease genomics as well as key staff who are
          deeply involved with building and maintaining gnomAD.
        </p>
        <h3>gnomAD Co-Directors</h3>
        <TeamSectionList>
          {teamMembers.gnomadCoDirectors.map((councilMember) => {
            return (
              <TeamCard
                key={councilMember.name}
                title={councilMember.name}
                description={councilMember.bio}
                headshotSource={councilMember.headshotSource}
              />
            )
          })}
        </TeamSectionList>
        <h3>gnomAD Steering Committee</h3>
        <TeamSectionList>
          {teamMembers.gnomadCommittee.map((councilMember) => {
            return (
              <TeamCard
                key={councilMember.name}
                title={councilMember.name}
                description={councilMember.bio}
                headshotSource={councilMember.headshotSource}
              />
            )
          })}
        </TeamSectionList>
      </TeamSection>
      <TeamSection>
        <h2>gnomAD&apos;s Scientific Advisory Board</h2>
        <p>
          Our Scientific Advisory Board, consists of a geographically and ethnically diverse set of
          individuals with backgrounds spanning genomics research, clinical service and ELSI work.
          The role of the gnomAD SAB is to provide guidance on the development of our resource and
          how we can best and most equitably serve the scientific and clinical communities.
        </p>
        <TeamSectionList>
          {teamMembers.scientificAdvisoryBoard.map((advisoryBoardMember) => {
            return (
              <TeamCard
                key={advisoryBoardMember.name}
                title={advisoryBoardMember.name}
                description={advisoryBoardMember.bio}
                headshotSource={advisoryBoardMember.headshotSource}
              />
            )
          })}
        </TeamSectionList>
      </TeamSection>

      {/* Section for Staff */}
      <TeamSection>
        <h2>Staff</h2>
        <TeamSectionList>
          <ColumnList>
            <ResponsiveColumn>
              <h3 id="website-staff">Website</h3>
              <Contributors
                aria-labelledby="website-staff"
                dangerouslySetInnerHTML={{ __html: websiteStaff.html }}
              />
            </ResponsiveColumn>
            <ResponsiveColumn>
              <h3 id="production-staff">Production</h3>
              <Contributors
                aria-labelledby="production-staff"
                dangerouslySetInnerHTML={{ __html: productionStaff.html }}
              />
            </ResponsiveColumn>
            <ResponsiveColumn>
              <h3 id="operations-staff">Operations</h3>
              <Contributors
                aria-labelledby="operations-staff"
                dangerouslySetInnerHTML={{ __html: operationsStaff.html }}
              />
            </ResponsiveColumn>
          </ColumnList>
        </TeamSectionList>
      </TeamSection>

      {/* Section for Contributors */}
      <TeamSection>
        <h2>Contributors</h2>
        <TeamSectionList>
          <ColumnList>
            <ResponsiveColumn>
              <h3 id="data-generation-contributors">Data Generation</h3>
              <Contributors
                aria-labelledby="data-generation-contributors"
                dangerouslySetInnerHTML={{ __html: dataGenerationContributors.html }}
              />
              <br />
              <h3 id="broad-genomics-platform">Broad Genomics Platform</h3>
              <Contributors
                aria-labelledby="broad-genomics-platform"
                dangerouslySetInnerHTML={{ __html: broadGenomicsPlatformContributors.html }}
              />
            </ResponsiveColumn>
            <ResponsiveColumn>
              <h3 id="structural-variation-contributors">Structural Variants</h3>
              <Contributors
                aria-labelledby="structural-variation-contributors"
                dangerouslySetInnerHTML={{ __html: structuralVariantsContributors.html }}
              />
              <br />
              <h3 id="mitochondrial-variants-contributors">Mitochondrial Variants</h3>
              <Contributors
                aria-labelledby="mitochondrial-variants-contributors"
                dangerouslySetInnerHTML={{ __html: mitochondrialVariantsContributors.html }}
              />
            </ResponsiveColumn>
            <ResponsiveColumn>
              <h3 id="ethics-contributors">Production and Analysis</h3>
              <Contributors
                aria-labelledby="production-and-analysis-contributors"
                dangerouslySetInnerHTML={{ __html: productionAndAnalysisContributors.html }}
              />
              <br />
              <h3 id="ethics-contributors">Ethics</h3>
              <Contributors
                aria-labelledby="ethics-contributors"
                dangerouslySetInnerHTML={{ __html: ethicsContributors.html }}
              />
            </ResponsiveColumn>
          </ColumnList>
        </TeamSectionList>
      </TeamSection>

      {/* Section for Alumni */}
      <TeamSection>
        <h2>Alumni</h2>
        <TeamSectionList>
          <ColumnList>
            <div>
              <Contributors
                aria-labelledby="alumni"
                dangerouslySetInnerHTML={{ __html: alumni.html }}
              />
            </div>
          </ColumnList>
        </TeamSectionList>
      </TeamSection>
    </Team>
  </InfoPage>
)
