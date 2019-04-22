import React from 'react'
import styled from 'styled-components'

import { ExternalLink } from '@broad/ui'

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
  margin-bottom: 40px;
`

const SubHeading = styled.h2`
  padding-top: 0;
  padding-bottom: 0;
  font-size: 1.2em;
  font-weight: lighter;
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
        Examples - Gene:{' '}
        <Link preserveSelectedDataset={false} to="/gene/PCSK9">
          PCSK9
        </Link>
        , Variant:{' '}
        <Link preserveSelectedDataset={false} to="/variant/1-55516888-G-GA">
          1-55516888-G-GA
        </Link>
      </p>
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
      The data set provided on this website spans 125,748 exome sequences and 15,708 whole-genome
      sequences from unrelated individuals sequenced as part of various disease-specific and
      population genetic studies. The gnomAD Principal Investigators and groups that have
      contributed data to the current release are listed{' '}
      <Link preserveSelectedDataset={false} to="/about">
        here
      </Link>
      .
    </p>
    <p>
      All data here are released for the benefit of the wider biomedical community, without
      restriction on use - see the terms of use{' '}
      <Link preserveSelectedDataset={false} to="/terms">
        here
      </Link>
      . Sign up for our mailing list for future release announcements{' '}
      <ExternalLink href="https://groups.google.com/forum/#!forum/exac_data_announcements">
        here
      </ExternalLink>
      .
    </p>
  </HomePage>
)
