import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { actions as geneActions } from '@broad/redux-genes'

const HomePageWrapper = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 80%;
  align-items: center;
  margin-top: 80px;
  margin-left: 50px;
  margin-right: 50px;
  ${'' /* border: 1px solid blue; */}
`

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 60%;
  ${'' /* border: 1px solid red; */}
`

const Title = styled.h1`
  font-family: Roboto;
  ${'' /* font-family: "HelveticaNeue-CondensedBold"; */}
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
  font-size: 20px;
  font-family: Roboto;
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
${'' /* border: 1px soliinspectord #000; */}
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
  ${'' /* width: 100%; */}
  ${'' /* border: 1px solid #000; */}

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
        <ParagraphText>Lorem ipsum dolor sit amet, consectetur adipisicing elit.
          Et corrupti dolore qui debitis voluptatem consectetur doloribus repellendus
          soluta atque consequuntur molestias dolor porro, rem, pariatur minus
          eligendi vero dolorum recusandae incidunt sint laborum. Delectus ipsa
          amet, nobis.</ParagraphText>
        <SearchContainer>
        </SearchContainer>
        <Announcements>
          <AnnouncementsTitle>Announcements</AnnouncementsTitle>
          <Announcement>
            <AnnouncementHeader>
              <em>October 17, 2017</em>. Tempora,
              possimus, iusto. Rem explicabo, consequuntur cumque id itaque deserunt,
               harum provident?
            </AnnouncementHeader>
            <AnnouncementParagraphText>
              Et corrupti dolore qui debitis voluptatem consectetur doloribus repellendus
              soluta atque consequuntur molestias dolor porro, rem, pariatur minus
              eligendi vero dolorum recusandae incidunt sint laborum. Delectus ipsa
              amet, nobis.
            </AnnouncementParagraphText>
          </Announcement>
          <Announcement>
            <AnnouncementHeader>
              <em>September 19, 2017</em>: Lorem ipsum dolor sit amet, consectetur adipisicing
              elit. Nihil, similique.
            </AnnouncementHeader>
            <AnnouncementParagraphText>
              Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora,
              possimus, iusto. Rem explicabo, consequuntur cumque id itaque deserunt,
               harum provident?
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
