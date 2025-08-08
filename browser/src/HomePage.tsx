import queryString from 'query-string'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import Link from './Link'
import Searchbox from './Searchbox'
// import GnomadLogo from './GnomadLogo'

import OurDNALogo from './OurDnaLogo'

const HomePage = styled(InfoPage)`
  max-width: 740px;
  margin-top: 90px;
`

const HeadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 1em;
`

const _Heading = styled.h1`
  padding-top: 0;
  padding-bottom: 0;
  font-size: 1.2em;
  font-weight: normal;
  letter-spacing: 2px;
  text-align: center;
`

export default () => (
  <HomePage>
    <DocumentTitle />
    <HeadingContainer>
      {/* <GnomadLogo width="60%" /> */}
      <OurDNALogo width="100%" />
      {/* <Heading>OurDNA Browser</Heading> */}
    </HeadingContainer>

    <Searchbox width="100%" />

    <div
      style={{
        height: '1em',
        borderBottom: '1px solid #666',
        margin: '1em 0 2em',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          position: 'relative',
          top: '0.5em',
          padding: '0 0.5em',
          background: '#fafafa',
        }}
      >
        Or
      </span>
    </div>

    <h2 style={{ fontSize: '1em' }}>Examples</h2>
    {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
    <List>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Gene:{' '}
        <Link preserveSelectedDataset={false} to="/gene/ENSG00000169174">
          PCSK9
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Transcript:{' '}
        <Link preserveSelectedDataset={false} to="/transcript/ENST00000302118">
          ENST00000302118
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Variant:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant/1-1000079-A-G',
            search: queryString.stringify({ dataset: 'ourdna' }),
          }}
        >
          1-1000079-A-G
        </Link>
      </ListItem>
    </List>

    <h2>New to OurDNA Browser?</h2>
    <p>
    {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
    The OurDNA browser is a resource intended for clinicians and researchers. If you are part of one of our OurDNA communities and you would like to learn more about the program, please see the <ExternalLink href="https://www.ourdna.org.au">OurDNA website.</ExternalLink>
    </p>
    <p>
      Check out these resources to learn about gnomAD and how to use it for variant interpretation.
    </p>
    {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
    <List>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://onlinelibrary.wiley.com/doi/10.1002/humu.24309">
          <em>
            Gudmundsson et al. Variant interpretation using population databases: Lessons from
            gnomAD.
          </em>{' '}
          Hum Mutat. 2022 Aug;43(8):1012-1030.
        </ExternalLink>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://www.broadinstitute.org/videos/mpg-primer-using-gnomad-tips-and-tricks">
          Using gnomAD - tips and tricks (video)
        </ExternalLink>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://www.broadinstitute.org/videos/gnomad-using-large-genomic-data-sets-interpret-human-genetic-variation">
          gnomAD: Using large genomic data sets to interpret human genetic variation (video)
        </ExternalLink>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://rarediseasegenomics.org/blog/six-lessons-for-variant-interpretation">
          Six lessons for variant interpretation
        </ExternalLink>
      </ListItem>
    </List>

    <h2>About the OurDNA Browser</h2>

    <p>
      The{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://www.ourdna.org.au">OurDNA program</ExternalLink>
      {' '}
      is a flagship initiative of the{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://populationgenomics.org.au">Centre for Population Genomics</ExternalLink>
      {' '}to increase the genomic representation of multicultural communities. 
      The OurDNA program aims to aggregate and share genetic variation data from over 20,000 Australians, 
      including 8,000 new high-quality whole genome sequences from participants from 
      genomically underrepresented groups recruited following participatory community engagement.
    </p>
    <p>
      The goal of the OurDNA program is to fix a gap in genetic research. Many Australian ancestry groups are not included right now — and we’re working to change that. 
      Please see{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://www.ourdna.org.au">OurDNA</ExternalLink>
      {' '}
      for more information about the OurDNA Cohort and the Centre for Population Genomics&apos; mission to partner with multicultural communities to advance genetic research and medicine in Australia. 
      The OurDNA Browser provides access to harmonised, aggregated genome and exome sequences from the OurDNA program.
    </p>
    <p>
      The OurDNA program is overseen by the director of the Centre for Population Genomics, Daniel MacArthur. 
      To learn more about program governance and institutional support, please visit our
      {' '}
      <Link to="/about">
      Funding
      </Link>
      {' '}
      page.
    </p>
    <p>
    The OurDNA browser is part of the{' '}
    <Link to="/federated">
      federated gnomAD network
    </Link>.
    </p>
    <p>
    Aggregate data download is currently under development. Please check back for a release date.
    </p>
  </HomePage>
)
