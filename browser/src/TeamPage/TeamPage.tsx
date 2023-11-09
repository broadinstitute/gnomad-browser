import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Link, PageHeading } from '@gnomad/ui'

// JSON containing information for all members with bios and headshots
import teamMembers from './TeamMembers.json'

// use Webpack Context to dynamically import all headshots
import headshotImages from './headshotLoader'

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

type Member = {
  name: string
  bio: string
  headshotSource: string
  alsoOnCommittee?: boolean
}

const renderTeamMembers = (members: Member[]) => {
  return (
    <TeamSectionList>
      {members.map((member: Member) => {
        return (
          <TeamCard
            key={member.name}
            title={member.name}
            description={member.bio}
            headshotSource={member.headshotSource}
            alsoOnCommitteeHuh={member.alsoOnCommittee}
          />
        )
      })}
    </TeamSectionList>
  )
}

// Component to be used for a TeamCard, only used on this page
// @ts-expect-error
const TeamCard = ({ title, description, headshotSource, alsoOnCommitteeHuh }) => {
  return (
    <TeamHeadshotAndDescription>
      <Row>
        <ImageColumn>
          {headshotSource && (
            <Headshot
              alt={`Headshot of ${title}`}
              src={
                // @ts-expect-error
                headshotImages[headshotSource]
              }
            />
          )}
        </ImageColumn>
        <TextColumn>
          <TextTitle>{title}</TextTitle>
          {alsoOnCommitteeHuh && (
            <TextBlurb>
              , in addition to being a member of the {/* @ts-expect-error */}
              <Link href="#steering-committee"> gnomAD Steering Committee</Link>
              {', '}
            </TextBlurb>
          )}
          <TextBlurb> {description}</TextBlurb>
        </TextColumn>
      </Row>
    </TeamHeadshotAndDescription>
  )
}

TeamCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  headshotSource: PropTypes.string,
  alsoOnCommitteeHuh: PropTypes.bool,
}

TeamCard.defaultProps = {
  headshotSource: 'blank_profile.jpg',
  alsoOnCommitteeHuh: false,
}

const TeamHeadshotAndDescription = styled.div`
  width: 100%;
  padding-bottom: 2rem;
`

const Row = styled.div`
  display: flex;

  @media screen and (max-width: 992px) {
    display: block;
    margin-bottom: 2em;
  }
`

const ImageColumn = styled.div`
  padding-right: 0.5rem;

  @media screen and (max-width: 992px) {
    margin-bottom: 1em;
  }
`

const Headshot = styled.img`
  width: 12rem;
`

const TextColumn = styled.div`
  padding-left: 2rem;
  line-height: 1.5;
  text-align: start;

  @media screen and (max-width: 992px) {
    padding-left: 0;
  }
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

const TeamPage = () => {
  return (
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
          <h2 id="gnomad-committee">gnomAD Steering Committee</h2>
          <p>
            The gnomAD Steering Committee (SC) consists of investigators with expertise in genomic
            sequencing, computational analysis, and rare disease genomics as well as key staff who
            are deeply involved with building and maintaining gnomAD.
          </p>
          <br />

          <h3 id="co-directors">gnomAD Co-Directors</h3>
          {renderTeamMembers(teamMembers.gnomadCoDirectors)}

          <h3 id="steering-committee">gnomAD Steering Committee</h3>
          {renderTeamMembers(teamMembers.gnomadCommittee)}
        </TeamSection>

        <TeamSection>
          <h2 id="scientific-advisory-board">gnomAD&apos;s Scientific Advisory Board</h2>
          <p>
            Our Scientific Advisory Board, consists of a geographically and ethnically diverse set
            of individuals with backgrounds spanning genomics research, clinical service and ELSI
            work. The role of the gnomAD SAB is to provide guidance on the development of our
            resource and how we can best and most equitably serve the scientific and clinical
            communities.
          </p>
          {renderTeamMembers(teamMembers.scientificAdvisoryBoard)}
        </TeamSection>

        {/* Section for Staff */}
        <br />
        <TeamSection>
          <h2 id="gnomad-staff">Staff</h2>
          <p>
            Our staff includes individuals with a variety of backgrounds and skills including
            software development, computational biology, project management, and clinical genetics.
            The team works to create the gnomAD datasets, develop and support the browser, answer
            all gnomAD emails, and handle all the regulatory requirements, amongst many other roles.
          </p>

          <br />
          <h3 id="website-staff">Website</h3>
          {renderTeamMembers(teamMembers.browser)}

          <br />
          <h3 id="production-staff">Production</h3>
          {renderTeamMembers(teamMembers.production)}

          <br />
          <h3 id="operations-staff">Operations</h3>
          {renderTeamMembers(teamMembers.operations)}
        </TeamSection>

        {/* Section for Contributors */}
        <TeamSection>
          <h2 id="gnomad-contributors">Contributors</h2>
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
          <h2 id="gnomad-alumni">Alumni</h2>
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
}

export default TeamPage
