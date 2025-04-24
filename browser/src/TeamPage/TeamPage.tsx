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
// ts-expect-error
// import productionAndAnalysisContributors from '../../about/contributors/production-and-analysis.md'
// ts-expect-error
// import structuralVariantsContributors from '../../about/contributors/structural-variation.md'
// ts-expect-error
// import mitochondrialVariantsContributors from '../../about/contributors/mitochondrial-variation.md'
// ts-expect-error
// import broadGenomicsPlatformContributors from '../../about/contributors/broad-genomics-platform.md'
// ts-expect-error
// import ethicsContributors from '../../about/contributors/ethics.md'
// ts-expect-error
// import tandemRepeatContributors from '../../about/contributors/tandem-repeats.md'

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
      <DocumentTitle title="The Team" />
      {/* // @ts-expect-error */}
      <PageHeading
        // @ts-expect-error
        id="the-gnomad-team"
      >
        The OurDNA Browser Team
      </PageHeading>
      <Team>
        <TeamSection>
          <h2 id="gnomad-committee">Steering Committee</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          <br />

          <h3 id="co-directors">OurDNA Browser Co-Directors</h3>
          {renderTeamMembers(teamMembers.gnomadCoDirectors)}

          <h3 id="steering-committee">OurDNA Browser Steering Committee</h3>
          {renderTeamMembers(teamMembers.gnomadCommittee)}
        </TeamSection>

        <TeamSection>
          <h2 id="scientific-advisory-board">OurDNA Browser&apos;s Scientific Advisory Board</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          {renderTeamMembers(teamMembers.scientificAdvisoryBoard)}
        </TeamSection>

        {/* Section for Staff */}
        <br />
        <TeamSection>
          <h2 id="gnomad-staff">Staff</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
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
