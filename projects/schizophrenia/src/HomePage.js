import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { actions as geneActions } from '@broad/redux-genes'

const HomePageWrapper = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  margin: 80px 50px 50px;
`

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 60%;
`

const Title = styled.h1`
  font-family: Roboto;
  font-size: 60px;
  font-weight: bold;
  margin-bottom: 5px;
  padding-bottom: 0;
`


const Subtitle = styled.h2`
  padding: 0;
  margin: 0;
  font-size: 30px;
`

const ParagraphText = styled.p`
  font-size: 16px;
  font-family: Roboto;
  margin-top:  9px;
  margin-bottom: 9px;
`

const SearchContainer = styled.div`
  align-self: center;
  margin-bottom: 30px;
`

const Announcements = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: center;
  margin-top: 10px;
  width: 100%;
`

const AnnouncementsTitle = styled.h2`
  padding: 0;
  margin: 0;
  font-size: 20px;
`

const Announcement = styled.div`
  width: 100%;
`

const AnnouncementHeader = styled.h3`
  font-size: 16px;
  font-weight: bold;
  font-family: Roboto;
  align-self: center;
`

const AnnouncementParagraphText = ParagraphText.extend`
  font-size: 16px;
`

const Logos = styled.div`
  display: flex;
  margin-top: 20px;
`

const imageSettings = {
  alignSelf: 'center',
  width: '300px',
  height: 'auto',

}

const HomePage = ({ setCurrentGene }) => {
  return (
    <HomePageWrapper>
      <TitleGroup>
        <Title>SCHEMA</Title>
        <Subtitle>Schizophrenia exome meta-analysis consortium</Subtitle>
        <ParagraphText>The Schizophrenia Exome Sequencing Meta-analysis (SCHEMA) consortium is a large multi-site collaboration dedicated to aggregating, generating, and analyzing high-throughput sequencing data of schizophrenia patients to improve our understanding of disease architecture and advance gene discovery. The consortium was formed in mid-2017 with a deep commitment of data sharing, diversity, and inclusivity - our hope is that the findings from this study and others like it will provide a foundation for further investigation of disease mechanism and therapeutic discovery. This browser is part of that overall effort to display and share these results with the wider scientific community.</ParagraphText>

        <ParagraphText>To date, the SCHEMA consortium have have sequenced and processed the whole exomes of over 25,000 schizophrenia cases and 50,000 matched controls using a standardized protocol, yielding one of the largest sequencing data sets of a complex trait to date. Our study has actively recruited from diverse global populations, and includes individuals of European, Latin American, East Asian, Ashkenazi Jewish, and African American ancestry. Because the sequence data was generated with various capture technologies over a span of seven years, we adapted and developed methods to reduce possible confounders, and incorporated this information during the quality control and analysis steps. The first results have provided genome-wide significant results associating rare variants in individual genes to risk of schizophrenia, and later releases are planned with larger number of samples that will further increase power.</ParagraphText>

        <ParagraphText>The SCHEMA consortium is made possible by the generosity of many funders, including the Stanley Foundation, and NIH, and the leadership of its members. The principal investigators and groups who have contributed to this current release are listed here. We would also like to thank the many tens of thousands of patients and families who generously contributed to our effort.</ParagraphText>

        <SearchContainer>
        </SearchContainer>
        <Announcements>
          <AnnouncementsTitle>Announcements</AnnouncementsTitle>
          <Announcement>
            <AnnouncementHeader>
              March, 2018

            </AnnouncementHeader>
            <AnnouncementParagraphText>
              The near-final release (v2) of the SCHEMA call set and analysis will be presented at a teleconference call in Spring 2018.

            </AnnouncementParagraphText>
          </Announcement>
          <Announcement>
            <AnnouncementHeader>
              December 20, 2017
            </AnnouncementHeader>
            <AnnouncementParagraphText>
              An alpha version of the exome sequencing results browser was launched at the final meeting of the year.
            </AnnouncementParagraphText>
          </Announcement>
          <Announcement>
            <AnnouncementHeader>
              October 15, 2017
            </AnnouncementHeader>
            <AnnouncementParagraphText>
              The first release (v1) of SCHEMA analysis with 25,000 cases and 50,000 controls was completed and shared internally. A presentation of these data and results was given at the World Congress of Psychiatric Genetics.
            </AnnouncementParagraphText>
          </Announcement>
          <Announcement>
            <AnnouncementHeader>
              July 20, 2017
            </AnnouncementHeader>
            <AnnouncementParagraphText>
              The inaugural SCHEMA consortium teleconference was held to discuss the first data freeze of schizophrenia sequencing data, and plans for analysis.
            </AnnouncementParagraphText>
          </Announcement>
        </Announcements>
      </TitleGroup>
      <Logos>
        <img
          style={imageSettings} src="https://storage.googleapis.com/gnomad-browser/assets/stanley.png"
          alt=""
        />
      </Logos>
    </HomePageWrapper>
  )
}
HomePage.propTypes = {
  setCurrentGene: PropTypes.func.isRequired,
}

export default connect(null, (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(geneActions.setCurrentGene(geneName)),
  }
})(HomePage)
