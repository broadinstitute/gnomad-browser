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

    <List style={{ marginBottom: '2em' }}>
      <ListItem>
        <Link to="/variant-cooccurrence">Find co-occurrence of two variants</Link>
      </ListItem>
      <ListItem>
        <Link to="/downloads">Download gnomAD data</Link>
      </ListItem>
      <ListItem>
        <Link to="/publications">Read gnomAD publications</Link>
      </ListItem>
    </List>

    <p>
      Please note that gnomAD v2.1.1 and v3.1.2 have substantially different but overlapping sample
      compositions and are on different genome builds. For more information, see{' '}
      <Link to="/help/should-i-switch-to-the-latest-version-of-gnomad">
        &quot;Should I switch to the latest version of gnomAD?&quot;
      </Link>
    </p>

    <h2 style={{ fontSize: '1em' }}>Examples</h2>
    <List>
      <ListItem>
        Gene:{' '}
        <Link preserveSelectedDataset={false} to="/gene/ENSG00000169174">
          PCSK9
        </Link>
      </ListItem>
      <ListItem>
        Transcript:{' '}
        <Link preserveSelectedDataset={false} to="/transcript/ENST00000302118">
          ENST00000302118
        </Link>
      </ListItem>
      <ListItem>
        gnomAD v3.1.2 variant:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant/1-55051215-G-GA',
            search: queryString.stringify({ dataset: 'gnomad_r3' }),
          }}
        >
          1-55051215-G-GA
        </Link>
      </ListItem>
      <ListItem>
        gnomAD v3 mitochondrial variant:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant/M-8602-T-C',
            search: queryString.stringify({ dataset: 'gnomad_r3' }),
          }}
        >
          M-8602-T-C
        </Link>
      </ListItem>
      <ListItem>
        gnomAD v3{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/short-tandem-repeats?dataset=gnomad_r3">
          short tandem repeat
        </ExternalLink>{' '}
        locus:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: 'short-tandem-repeat/DMD',
            search: queryString.stringify({ dataset: 'gnomad_r3' }),
          }}
        >
          DMD
        </Link>
      </ListItem>
      <ListItem>
        gnomAD v2.1.1 variant:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant/1-55516888-G-GA',
            search: queryString.stringify({ dataset: 'gnomad_r2_1' }),
          }}
        >
          1-55516888-G-GA
        </Link>
      </ListItem>
      <ListItem>
        gnomAD v2 structural variant:{' '}
        <Link
          preserveSelectedDataset={false}
          to={{
            pathname: '/variant/DUP_2_5708',
            search: queryString.stringify({ dataset: 'gnomad_sv_r2_1' }),
          }}
        >
          DUP_2_5708
        </Link>
      </ListItem>
      <ListItem>
        Variant co-occurrence:{' '}
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
    <List>
      <ListItem>
        <ExternalLink href="https://arxiv.org/abs/2107.11458">
          <em>Variant interpretation using population databases: lessons from gnomAD.</em> arXiv{' '}
          2107.11458 [q-bio.GN] (2021).
        </ExternalLink>
      </ListItem>
      <ListItem>
        <ExternalLink href="https://www.broadinstitute.org/videos/mpg-primer-using-gnomad-tips-and-tricks">
          Using gnomAD - tips and tricks (video)
        </ExternalLink>
      </ListItem>
      <ListItem>
        <ExternalLink href="https://www.broadinstitute.org/videos/gnomad-using-large-genomic-data-sets-interpret-human-genetic-variation">
          gnomAD: Using large genomic data sets to interpret human genetic variation (video)
        </ExternalLink>
      </ListItem>
      <ListItem>
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
      The v2.1.1 data set (GRCh37/hg19) provided on this website spans 125,748 exome sequences and
      15,708 whole-genome sequences from unrelated individuals sequenced as part of various
      disease-specific and population genetic studies. The v3.1.2 data set (GRCh38) spans 76,156
      genomes{' '}
      <ExternalLink href="https://gnomad.broadinstitute.org/help/what-populations-are-represented-in-the-gnomad-data">
        of diverse ancestries
      </ExternalLink>
      , selected as in v2. The gnomAD Principal Investigators and groups that have contributed data
      to the current release are listed{' '}
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
      <ExternalLink href="https://groups.google.com/forum/#!forum/exac_data_announcements">
        mailing list
      </ExternalLink>{' '}
      for future release announcements.
    </p>
  </HomePage>
)
