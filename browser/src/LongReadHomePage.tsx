import React from 'react'
import styled from 'styled-components'

import { List, ListItem } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import GnomadLogo from './GnomadLogo'
import InfoPage from './InfoPage'
import Link from './Link'
import Searchbox from './Searchbox'

const Page = styled(InfoPage)`
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

const LongReadHeading = styled.h2`
  margin: 24px 0 20px;
  color: #000;
  font-size: 1.5em;
  font-weight: normal;
`

const SectionHeading = styled.h3`
  margin: 24px 0 10px;
  color: #333;
  font-size: 1em;
  font-weight: 600;
`

const DatasetSummary = styled.div`
  color: #444;
  font-size: 0.9375em;
  line-height: 1.6;

  p {
    margin: 0 0 12px;
  }
`

const ExamplesList = styled(List)`
  margin-top: 0;

  li {
    padding: 4px 0;
    line-height: 1.5;
  }

  li::marker {
    color: #176b8a;
  }

  a {
    font-weight: 500;
  }
`

const Coordinates = styled.span`
  display: inline-block;
  margin-left: 8px;
  color: #666;
  font-size: 0.875em;
`

// Selected from LongReadExamplesPage. Keep coordinates and haplotype settings in sync.
const featuredRegions = [
  {
    title: 'MHC region',
    region: '6-31400000-31450000',
    haplotypes: true,
  },
  {
    title: 'Subtelomeric repeats',
    region: '1-2100000-2150000',
    haplotypes: true,
  },
  {
    title: 'AMY1A / AMY1B / AMY2A',
    region: '1-103600000-103650000',
    haplotypes: false,
  },
]

const LongReadHomePage = () => (
  <Page>
    <DocumentTitle title="Long-read beta" />
    <HeadingContainer>
      <GnomadLogo width="60%" />
      <Heading>Genome Aggregation Database</Heading>
    </HeadingContainer>

    <Searchbox width="100%" />

    <LongReadHeading>Long Read beta</LongReadHeading>
    <DatasetSummary>
      <p>
        Explore structural variants, tandem repeats, and other genetic variation from long-read
        sequencing in <strong>HGSVC/HPRC</strong> and <strong>All of Us (AoU)</strong>. Both
        datasets provide allele frequencies and repeat-length distributions, helping characterize
        variation in complex and repetitive regions of the genome.
      </p>
      <p>
        <strong>HGSVC/HPRC</strong> additionally includes haplotype and methylation views, allowing
        exploration of how nearby variants occur together and their associated methylation patterns.
      </p>
    </DatasetSummary>
    <SectionHeading>Examples</SectionHeading>
    <ExamplesList>
      {featuredRegions.map((example) => (
        <ListItem key={example.region}>
          <Link
            preserveSelectedDataset={false}
            to={`/region/${example.region}?dataset=gnomad_r4_lr${
              example.haplotypes ? '&show_haplotypes=true' : ''
            }`}
          >
            {example.title}
          </Link>
          <Coordinates>{example.region}</Coordinates>
        </ListItem>
      ))}
      <ListItem>
        <Link preserveSelectedDataset={false} to="/long-read-examples">
          Long-read example regions
        </Link>
      </ListItem>
    </ExamplesList>
  </Page>
)

export default LongReadHomePage
