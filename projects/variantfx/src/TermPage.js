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
const ulStyle = {
    fontSize: '18px',
}

const imageSettings = {
  alignSelf: 'center',
  width: '300px',
  height: 'auto',

}

const HomePage = ({ setCurrentGene }) => {
  return (
    <HomePageWrapper>
    <TitleGroup>
    <Title>Terms</Title>
    <JustifyParagraphText> All data contained within the <a href="http://cardiac.variantfx.org" title="VariantFX">Cardiac VariantFX</a> browser are released under a <a href="http://sanger.ac.uk/legal/assets/fortlauderdalereport.pdf" title="fort lauderdale">Fort Lauderdale Agreement</a> for the benefit of the wider biomedical community.<br />
    You may freely search the data, and use this aggregated data to support the interpretation of individual variants for any use.</JustifyParagraphText>

    <JustifyParagraphText>We ask that you refrain from publication of global analyses of the aggregated data set or the newly available quantitative metrics presented, or analyses of the unpublished cohorts included here for the first time (specifically NHCS, Singapore &amp; AHC, Egypt) until analyses already underway are reported.  This would include using this data in publications reporting population-specific variants observed in these new cohorts.  </JustifyParagraphText>

    <JustifyParagraphText>If you are unsure whether your analysis or use would fall within the scope of these Terms please <a href="mailto:j.ware@imperial.ac.uk">contact us</a>.  It may be appropriate to collaborate directly in some cases.</JustifyParagraphText>

    <JustifyParagraphText>The data are available under the <a href="http://opendatacommons.org/licenses/odbl/1.0/" title="ODbL">ODC Open Database License (ODbL)</a> (summary <a href="https://opendatacommons.org/licenses/odbl/summary/" title="ODbL summary">here</a>). You are free to share and modify the Cardiac VariantFX data so long as you:</JustifyParagraphText>

    <ul style={ulStyle}>
    <li>attribute any public use of the database</li>
    <li>attribute any or works produced from the database</li>
    <li>keep any resulting data sets open</li>
    <li>offer your shared or adapted version of the dataset under the same ODbL license</li>
    </ul>

    <h3 id="toc_1">For citations in publications and public presentations</h3>

    <JustifyParagraphText>We request that any use of data obtained from the Cardiac VariantFX browser acknowledges the Website as origin of the data used. </JustifyParagraphText>

    <JustifyParagraphText>e.g. Cardiac Variant Interpretation Consortium. (2017). Cardiac VariantFX. [online] Available at: <a href="http://cardiac.variantfx.org">http://cardiac.variantfx.org</a> [Accessed <em>date accessed</em>].</JustifyParagraphText>

    <JustifyParagraphText>A full list of contributing groups can be found on the <a href="http://cardiac.variantfx.org/about" title="about">about</a> page.</JustifyParagraphText>

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
