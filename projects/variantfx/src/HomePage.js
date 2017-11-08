import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { actions as activeActions } from '@broad/gene-page/src/resources/active'

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

const Subtitle = styled.h2`
  padding: 0;
  margin: 0;
  font-size: 30px;
`

const ParagraphText = styled.p`
  font-size: 20px;
  font-family: Helvetica Neue;
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
  font-family: Helvetica Neue;
  align-self: center;
`

const AnnouncementParagraphText = ParagraphText.extend`
  font-size: 16px;
`

const JustifyParagraphText = ParagraphText.extend`
line-height: 125%;
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
    <Title>VariantFX</Title>
    <JustifyParagraphText>

    The Cardiac VariantFX browser offers access to aggregated and harmonized genetic data from large series of individuals with inherited cardiovascular conditions together with population controls to improve our interpretation of individual rare variants.

    </JustifyParagraphText>


    <JustifyParagraphText>
    The first release data provided on this website represents N subjects with inherited cardiomyopathies and N reference samples from targeted sequencing and the genome aggregation database (<a href="http://gnomad.broadinstitute.org">gnomAD</a>).
    </JustifyParagraphText>

    <JustifyParagraphText>
    Further information about the data, the web site, and those who have contributed is available <a href="http://variantfx.org:81/about">here</a>.
    Aggregated data are released ahead of publication under a Fort Lauderdale Agreement <a href="http://www.sanger.ac.uk/legal/assets/fortlauderdalereport.pdf">http://www.sanger.ac.uk/legal/assets/fortlauderdalereport.pdf</a> for the benefit of the wider biomedical community - see the terms of use <a href="http://variantfx.org:81/terms">here</a>.
    </JustifyParagraphText>
    </TitleGroup>
    </HomePageWrapper>
  )
}
HomePage.propTypes = {
  setCurrentGene: PropTypes.func.isRequired,
}

export default connect(null, (dispatch) => {
  return {
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
  }
})(HomePage)
