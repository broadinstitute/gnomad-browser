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

const JustifyParagraphText = styeld(ParagraphText)`
line-height: 125%;
`

const olStyle = {
  fontSize: '18px',
}


export default () => {
  return (
    <HomePageWrapper>
      <TitleGroup>
        <Title>Frequently Asked Questions</Title>
        <br />
        <br />

        <JustifyParagraphText>*Actual numbers of samples varies by gene. The number reported in this tables represents the maximum number of samples sequenced across for any gene.</JustifyParagraphText>

        <Subtitle>How was the ethnicity of each sample determined?</Subtitle>

        <JustifyParagraphText>In version 0.1 of Cardiac VariantFX ethnicity determination is via self-report at sample recruitment. Local ethnicity codes were then assigned to one of the eight population codes used in gnomAD to allow ethnicity matching across all cohorts.</JustifyParagraphText>

        <Subtitle>How are variant types assigned in the VariantFX browser?</Subtitle>

        <JustifyParagraphText>Only variants with allele frequency in gnomAD &lt; 0.0001 (combined exomes and genomes) are displayed in the cohort summary table and used for the disease burden analysis calculations. </JustifyParagraphText>

        <JustifyParagraphText>Variants are split into the following categories (as defined by the Ensembl variant effect predictor (VEP):</JustifyParagraphText>

        <JustifyParagraphText>Truncating -&gt; Frameshift, nonsense and essential splice-site (+-2)
        Missense -&gt; Non-synonymous
        Other Non-truncating -&gt; splice region variant (+-8), inframe insertion, inframe deletion, stop lost and start lost</JustifyParagraphText>

        <JustifyParagraphText>Protein Altering -&gt; A aggregation of all truncating, missense and other non-truncating variants</JustifyParagraphText>

        <Subtitle>Can I download the data?</Subtitle>

        <JustifyParagraphText>We have not provided a data download option for version 0.1 of Cardiac VariantFX but this will be provided in future releases of the tool.</JustifyParagraphText>

        <Subtitle>How do I contribute?</Subtitle>

        <JustifyParagraphText>We are continously looking to expand the dataset of inhertied cardiac disease cases included in Cardiac VariantFX. If you would like to contribute your data please <a href="e.mazaika@imperial.ac.uk" title="contact">contact us</a>.</JustifyParagraphText>

        <Subtitle>My favourite gene is not included, what can I do?</Subtitle>

        <JustifyParagraphText>The initial release of Cardiac VariantFX includes a limited number of gene-disease pairs representing links with very strong evidence and significant contributions to disease. We will expand the list of both genes and diseases in future releases. If your research question is urgent, please <a href="e.mazaika@imperial.ac.uk" title="contact">contact us</a> to discuss collaborative use of the data.</JustifyParagraphText>

        <Subtitle>How do I report an issue?</Subtitle>

        <JustifyParagraphText>Please log any issues with the data or the VariantFX browser using our issue tracker on <a href="%22issueTracker%22">GitHub</a>.</JustifyParagraphText>

        <Subtitle>What is the VariantFX platform?</Subtitle>

        <JustifyParagraphText>The platform underpinning Cardiac VariantFX was designed from the outset to be readily deployable to other disease areas.  We use a containerised framework, with three docker containers housing the database (MongoDB), the API (GraphQL), and the web front-end (ReactJS).  A fourth container holds seed data to populate the database when the platform is first deployed.</JustifyParagraphText>



        <Subtitle>Can I deploy VariantFX myself, or use it to create a similar resource for a different condition?</Subtitle>

        <JustifyParagraphText>The source code will be available on GitHub shortly.</JustifyParagraphText>

        <JustifyParagraphText>To deploy VariantFX as is:</JustifyParagraphText>

        <ol style={olStyle}>
          <li>Install and start <a href="https://docs.docker.com/engine/installation/" title="Docker">Docker</a></li>
          <li>Clone the VariantFX repository from Github <code>git clone git@github.com:ImperialCardioGenetics/vfx.git</code></li>
          <li>Change directory to VariantFX <code>cd vfx</code></li>
          <li>Run command <code>docker-compose up</code></li>
          <li>The API will be accessible at <a href="">http://localhost:4000/graphql</a></li>
          <li>The front-end will be hosted at <a href="">http://localhost</a></li>
        </ol>

        <JustifyParagraphText>To host your own data, you will need to replace the seeded data, and modify the API &amp; front end to represent your own cohorts. </JustifyParagraphText>

      </TitleGroup>
    </HomePageWrapper>
  )
}
