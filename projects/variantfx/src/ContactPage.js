/* eslint-disable max-len */
import React from 'react'
import styled from 'styled-components'

const HomePageWrapper = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 80%;
  align-items: center;
  margin-top: 80px;
  margin-left: 50px;
  margin-right: 50px;
`

const TitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 60%;
`

const Title = styled.h1`
  font-family: "HelveticaNeue-CondensedBold";
  font-size: 50px;
  font-weight: bold;
  margin-bottom: 5px;
  padding-bottom: 0;
`

const ParagraphText = styled.p`
  font-size: 20px;
  font-family: Helvetica Neue;
`

const JustifyParagraphText = styled(ParagraphText)`
  line-height: 125%;
`

export default () => {
  return (
    <HomePageWrapper>
      <TitleGroup>
        <Title>Contact</Title>
        <JustifyParagraphText>This is a beta site and we encourage users to contact us with bugs or feature suggestions.</JustifyParagraphText>
        <JustifyParagraphText>You can <a href="mailto:e.mazaika@imperial.ac.uk">contact us</a> by email to report data problems, feature suggestions, or with queries about our Terms of use.</JustifyParagraphText>
        <JustifyParagraphText>Source code will shortly be available on GitHub.</JustifyParagraphText>
      </TitleGroup>
    </HomePageWrapper>
  )
}
