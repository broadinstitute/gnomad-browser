import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { PageHeading } from '@broad/ui'

import stanleyCenterLogo from './stanley-center-logo.png'

const HomePageContentWrapper = styled.div`
  font-size: 16px;
`

const Paragraph = styled.p`
  margin: 0 0 1em;
  line-height: 1.5;
`

const AnnouncementList = styled.ol`
  padding: 0;
  margin: 0 0 2em;

  li {
    list-style-type: none;
  }
`

const Announcement = ({ children, date }) => (
  <li>
    <strong>{date}</strong>
    <Paragraph>{children}</Paragraph>
  </li>
)

Announcement.propTypes = {
  children: PropTypes.node.isRequired,
  date: PropTypes.string.isRequired,
}

const Logo = styled.img`
  display: block;
  width: 300px;
  margin: 0 auto;
`

export default () => (
  <HomePageContentWrapper>
    <PageHeading>SCHEMA: Schizophrenia exome meta-analysis consortium</PageHeading>
    <Paragraph>
      The Schizophrenia Exome Sequencing Meta-analysis (SCHEMA) consortium is a large multi-site
      collaboration dedicated to aggregating, generating, and analyzing high-throughput sequencing
      data of schizophrenia patients to improve our understanding of disease architecture and
      advance gene discovery. The consortium was formed in mid-2017 with a deep commitment of data
      sharing, diversity, and inclusivity - our hope is that the findings from this study and others
      like it will provide a foundation for further investigation of disease mechanism and
      therapeutic discovery. This browser is part of that overall effort to display and share these
      results with the wider scientific community.
    </Paragraph>

    <Paragraph>
      To date, the SCHEMA consortium have have sequenced and processed the whole exomes of over
      25,000 schizophrenia cases and 50,000 matched controls using a standardized protocol, yielding
      one of the largest sequencing data sets of a complex trait to date. Our study has actively
      recruited from diverse global populations, and includes individuals of European, Latin
      American, East Asian, Ashkenazi Jewish, and African American ancestry. Because the sequence
      data was generated with various capture technologies over a span of seven years, we adapted
      and developed methods to reduce possible confounders, and incorporated this information during
      the quality control and analysis steps. The first results have provided genome-wide
      significant results associating rare variants in individual genes to risk of schizophrenia,
      and later releases are planned with larger number of samples that will further increase power.
    </Paragraph>

    <Paragraph>
      The SCHEMA consortium is made possible by the generosity of many funders, including the
      Stanley Foundation, and NIH, and the leadership of its members. The principal investigators
      and groups who have contributed to this current release are listed here. We would also like to
      thank the many tens of thousands of patients and families who generously contributed to our
      effort.
    </Paragraph>

    <h2>Announcements</h2>
    <AnnouncementList>
      <Announcement date="March, 2018">
        The near-final release (v2) of the SCHEMA call set and analysis will be presented at a
        teleconference call in Spring 2018.
      </Announcement>
      <Announcement date="December 20, 2017">
        An alpha version of the exome sequencing results browser was launched at the final meeting
        of the year.
      </Announcement>
      <Announcement date="October 15, 2017">
        The first release (v1) of SCHEMA analysis with 25,000 cases and 50,000 controls was
        completed and shared internally. A presentation of these data and results was given at the
        World Congress of Psychiatric Genetics.
      </Announcement>
      <Announcement date="July 20, 2017">
        The inaugural SCHEMA consortium teleconference was held to discuss the first data freeze of
        schizophrenia sequencing data, and plans for analysis.
      </Announcement>
    </AnnouncementList>
    <Logo alt="Stanley Center logo" src={stanleyCenterLogo} />
  </HomePageContentWrapper>
)
