import queryString from 'query-string'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import Link from './Link'
import Searchbox from './Searchbox'
import GnomadLogo from './GnomadLogo'

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

const Heading = styled.h1`
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
      <GnomadLogo width="60%" />
      <Heading>Genome Aggregation Database</Heading>
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

    {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
    <List style={{ marginBottom: '2em' }}>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Link to="/downloads">Download gnomAD data</Link>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Link to="/publications">Read gnomAD publications</Link>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Link to="/variant-cooccurrence">Find co-occurrence of two variants</Link>
      </ListItem>
    </List>

    <p>
      Please note that the gnomAD v3 genomes are now part of gnomAD v4. For more information, see{' '}
      <Link to="/help/should-i-switch-to-the-latest-version-of-gnomad">
        &quot;Should I switch to the latest version of gnomAD?&quot;
      </Link>
    </p>

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
            pathname: '/variant/1-55051215-G-GA',
            search: queryString.stringify({ dataset: 'gnomad_r4' }),
          }}
        >
          1-55051215-G-GA
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Structural variant region:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/region/19-11078371-11144910',
            search: queryString.stringify({ dataset: 'gnomad_sv_r4' }),
          }}
        >
          19-11078371-11144910
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Copy number variant region:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/region/2-49918501-51225575',
            search: queryString.stringify({ dataset: 'gnomad_cnv_r4' }),
          }}
        >
          19-11078371-11144910
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Mitochondrial variant:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant/M-8602-T-C',
            search: queryString.stringify({ dataset: 'gnomad_r4' }),
          }}
        >
          M-8602-T-C
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/short-tandem-repeats',
            search: queryString.stringify({ dataset: 'gnomad_r4' }),
          }}
        >
          Short tandem repeat{' '}
        </Link>
        locus:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: 'short-tandem-repeat/ATXN1',
            search: queryString.stringify({ dataset: 'gnomad_r4' }),
          }}
        >
          ATXN1
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Regional missense constraint (gnomAD v2, GRCh37):{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/gene/ENSG00000183454',
            search: queryString.stringify({
              dataset: 'gnomad_r2_1',
              variant: ['1-55505647-G-T', '1-55523855-G-A'],
            }),
          }}
        >
          GRIN2A
        </Link>
      </ListItem>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <ListItem>
        Variant co-occurrence (gnomAD v2, GRCh37):{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant-cooccurrence',
            search: queryString.stringify({
              dataset: 'gnomad_r2_1',
              variant: ['1-55505647-G-T', '1-55523855-G-A'],
            }),
          }}
        >
          1-55505647-G-T and 1-55523855-G-A
        </Link>
      </ListItem>
    </List>

    <h2>New to gnomAD?</h2>
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

    <h2>About gnomAD</h2>

    <p>
      The{' '}
      <Link preserveSelectedDataset={false} to="/about">
        Genome Aggregation Database
      </Link>{' '}
      (gnomAD) is a resource developed by an international coalition of investigators, with the goal
      of aggregating and harmonizing both exome and genome sequencing data from a wide variety of
      large-scale sequencing projects, and making summary data available for the wider scientific
      community.
    </p>
    <p>
      The v4 data set (GRCh38) provided on this website spans 730,947 exome sequences and 76,215
      whole-genome sequences from unrelated individuals, of{' '}
      <Link preserveSelectedDataset={false} to="/stats#diversity">
        diverse ancestries
      </Link>
      , sequenced as part of various disease-specific and population genetic studies. The gnomAD
      Principal Investigators and team can be found <Link to="/team">here</Link>, and the groups
      that have contributed data to the current release are listed{' '}
      <Link preserveSelectedDataset={false} to="/about">
        here
      </Link>
      .
    </p>
    <p>
      All data here are released for the benefit of the wider biomedical community, without
      restriction on use - see the{' '}
      <Link preserveSelectedDataset={false} to="/policies">
        terms of use
      </Link>
      . Sign up for our{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://groups.google.com/forum/#!forum/exac_data_announcements">
        mailing list
      </ExternalLink>{' '}
      for future release announcements.
    </p>
  </HomePage>
)
