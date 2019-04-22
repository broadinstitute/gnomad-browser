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

const Subtitle = styled.h2`
padding: 0;
margin: 0;
font-size: 30px;
`

const ParagraphText = styled.p`
font-size: 20px;
font-family: Helvetica Neue;
`

const JustifyParagraphText = styled(ParagraphText)`
line-height: 125%;
`

const ulStyle = {
  fontSize: '18px',
}

export default () => {
  return (
    <HomePageWrapper>
      <TitleGroup>
        <Title>About</Title>


        <JustifyParagraphText>Cardiac VariantFX and the Cardiac Variant Interpretation Consortium</JustifyParagraphText>

        <JustifyParagraphText>The Cardiac Variant Interpretation Consortium (CVIC) is a coalition of investigators in research and diagnostic laboratories seeking to understand genetic variation causing cardiovascular disease.  Specifically, we are aggregating and harmonizing genetic data from large series of individuals with inherited cardiovascular conditions and population controls to improve our interpretation of individual rare variants.</JustifyParagraphText>

        <JustifyParagraphText>One central characteristic of this effort is the use of quantitative methods for variant analyses.  While public repositories such as ClinVar catalogue observations of rare genetic variants, they do not usually preserve information about the frequencies of individual variants in cases.  This allele frequency domain allows us to calculate quantitative metrics that empower variant interpretation.  We also curate case-level variant data from multiple sources (e.g. de novo occurrence, segregation) and will present this in a structured format.</JustifyParagraphText>

        <JustifyParagraphText>In order to facilitate access to these aggregated datasets we created VariantFX, a newly designed web interface that is designed from the ground up to be modular and reusable – serving as a template platform for others who wish to host similar disease-specific data.</JustifyParagraphText>

        <JustifyParagraphText>The initial inherited cardiac conditions data release is available at <a href="http://cardiac.variantfx.org" title="VariantFX">http://cardiac.variantfx.org</a>, and represents 9,037 subjects with inherited cardiomyopathies and 140,712 reference samples comprising confirmed healthy volunteers and the <a href="gnomad.broadinstitute.org" title="gnomAD">genome aggregation database</a>.  Data are also available via API, and will be available via direct download in due course.</JustifyParagraphText>

        <JustifyParagraphText>Further details of the component datasets and contributors are found below.
    Information on the VariantFX platform is available <a href="#">here</a>.</JustifyParagraphText>

        <JustifyParagraphText>Please refer to the <a href="http://cardiac.variantfx.org/terms" title="terms of use">Terms of Use</a> when using data made available in this browser.</JustifyParagraphText>
        <br />
        <Title>Contributors</Title>
        <br />
        <br />

        <Subtitle>Contributing Principal Investigators (release 0.1)</Subtitle>

        <ul style={ulStyle}>
          <li>James Ware</li>
          <li>Birgit Funke</li>
          <li>Daniel MacArthur</li>
          <li>Declan O&#39;Regan</li>
          <li>Hugh Watkins</li>
          <li>Magdi Yacoub</li>
          <li>Sanjay Prasad</li>
          <li>Stuart Cook</li>
        </ul>

        <Subtitle>Contributing Centres (release 0.1)</Subtitle>

        <ul style={ulStyle}>
          <li>Imperial College London, UK</li>
          <li>MRC London Institute for Medical Sciences, UK</li>
          <li>The Broad Institute of MIT and Harvard, Boston MA</li>
          <li>Royal Brompton and Harefield NHS Foundation Trust, UK (<strong>RBHT</strong>)</li>
          <li>National Heart Centre, Singapore (<strong>NHCS</strong>)</li>
          <li>Aswan Heart Centre, Egypt (<strong>AHC</strong>)</li>
          <li>Oxford Medical Genetics Laboratories, Oxford University Hospitals NHS Foundation Trust, UK (<strong>OMGL</strong>)</li>
          <li>Laboratory of Molecular Medicine, Partners HealthCare Personalized Medicine, Boston MA (<strong>LMM</strong>)</li>
          <li>The Genome Aggregation Database (<strong>gnomAD</strong>)</li>
        </ul>

        <Subtitle>Production &amp; Analysis team</Subtitle>

        <ul style={ulStyle}>
          <li>Erica Mazaika</li>
          <li>Mian Ahmed</li>
          <li>Nicky Whiffin</li>
          <li>Roddy Walsh</li>
          <li>Risha Govind</li>
          <li>Andrew Harper</li>
          <li>Katie Francis</li>
          <li>Paul Barton</li>
          <li>Elizabeth Edwards</li>
          <li>Xiaolei Zhang</li>
          <li>Matthew Edwards</li>
          <li>Anne O’Donnell</li>
          <li>Jessica Alfoldi</li>
          <li>Kate Thomson</li>
          <li>Ahmed El Guindy</li>
          <li>Mona Allouba</li>
          <li>Alicja Wilk</li>
          <li>William Midwinter</li>
          <li>Hanna Najgebauer</li>
        </ul>

        <Subtitle>Website and infrastructure team</Subtitle>

        <ul style={ulStyle}>
          <li>Matthew Solomonson</li>
          <li>Mian Ahmed</li>
          <li>Mark Woodbridge</li>
          <li>Ben Weisburd</li>
          <li>Erica Mazaika</li>
        </ul>

        <Subtitle>Funding</Subtitle>

        <ul style={ulStyle}>
          <li>Wellcome Trust 107469/Z/15/Z (Ware)</li>
          <li>Health Innovation Challenge Fund Award, Wellcome Trust &amp; Department of Health HICF-R6-373 (Cook/Ware/Barton)</li>
          <li>British Heart Foundation SP/10/10/28431 (Cook)</li>
          <li>NIGMS R01 GM104371 (MacArthur)</li>
          <li>NIDDK U54 DK105566 (MacArthur)</li>
          <li>MRC London Institute for Medical Sciences</li>
          <li>NIHR Royal Brompton Cardiovascular BRU </li>
        </ul>

      </TitleGroup>
    </HomePageWrapper>
  )
}
