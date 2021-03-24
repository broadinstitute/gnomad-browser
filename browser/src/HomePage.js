import queryString from 'query-string'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import Link from './Link'
import Searchbox from './Searchbox'
import GnomadHeading from './GnomadHeading'

const HomePage = styled(InfoPage)`
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 740px;
  margin-top: 90px;
`

const HeadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 2em;
`

const SubHeading = styled.h2`
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
      <GnomadHeading width="60%" />
      <SubHeading>genome aggregation database</SubHeading>
      <Searchbox width="100%" />
      <p>
        Please note that gnomAD v2.1.1 and v3.1.1 have substantially different but overlapping
        sample compositions and are on different genome builds. For more information, see{' '}
        <Link to="/help/should-i-switch-to-the-latest-version-of-gnomad">
          &quot;Should I switch to the latest version of gnomAD?&quot;
        </Link>
      </p>
      <figure style={{ margin: '1em 0' }}>
        <figcaption>Examples</figcaption>
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
            gnomAD v3.1.1 variant:{' '}
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
        </List>
      </figure>
    </HeadingContainer>

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
      disease-specific and population genetic studies. The v3.1.1 data set (GRCh38) spans 76,156
      genomes, selected as in v2. The gnomAD Principal Investigators and groups that have
      contributed data to the current release are listed{' '}
      <Link preserveSelectedDataset={false} to="/about">
        here
      </Link>
      .
    </p>
    <p>
      All data here are released for the benefit of the wider biomedical community, without
      restriction on use - see the{' '}
      <Link preserveSelectedDataset={false} to="/terms">
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
