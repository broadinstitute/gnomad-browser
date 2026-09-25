import React from 'react'
import styled from 'styled-components'

import DocumentTitle from './DocumentTitle'
import GnomadLogo from './GnomadLogo'
import InfoPage from './InfoPage'
import Link from './Link'
import Searchbox from './Searchbox'

const Page = styled(InfoPage)`
  max-width: 940px;
  padding-bottom: 48px;
  margin-top: 48px;
`

const Hero = styled.header`
  padding: 32px 24px;
  border-top: 4px solid #287c83;
  border-radius: 8px;
  background: linear-gradient(125deg, #eef6f5, #f8f6ef);

  h1 {
    margin: 20px 0 12px;
    font-size: 2em;
    line-height: 1.2;
  }

  p {
    max-width: 640px;
    color: #40535a;
    line-height: 1.6;
  }
`

const Beta = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border: 1px solid #287c83;
  border-radius: 4px;
  margin-left: 12px;
  color: #205e63;
  font-size: 0.75em;
  font-weight: bold;
  letter-spacing: 0.08em;
  vertical-align: middle;
`

const Examples = styled.section`
  margin-top: 32px;

  h2 {
    font-size: 1.4em;
  }
`

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 20px 0;
`

const Card = styled.article`
  flex: 1 1 220px;
  min-width: 0;
  padding: 20px;
  border: 1px solid #d5e0df;
  border-top: 3px solid #287c83;
  border-radius: 6px;
  background: #fff;

  &:nth-child(2) {
    border-top-color: #8a6843;
  }

  &:nth-child(3) {
    border-top-color: #68608c;
  }

  h3 {
    margin: 12px 0;
    font-size: 1.1em;
    line-height: 1.4;
  }

  p {
    color: #40535a;
    line-height: 1.5;
  }

  code {
    color: #536569;
    font-size: 0.8em;
    overflow-wrap: anywhere;
  }

  a:focus-visible {
    outline: 2px solid #287c83;
    outline-offset: 4px;
  }
`

const Category = styled.span`
  color: #536569;
  font-size: 0.75em;
  font-weight: bold;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

// Selected from LongReadExamplesPage. Keep coordinates and haplotype settings in sync;
// descriptions deliberately omit dataset-specific counts and comparative discovery claims.
const featuredRegions = [
  {
    title: 'MHC region',
    category: 'Structural variation',
    description:
      'Explore tandem repeats and structural variation in the major histocompatibility complex.',
    region: '6-31400000-31450000',
    haplotypes: true,
  },
  {
    title: 'Subtelomeric repeats',
    category: 'Repeat-rich sequence',
    description: 'Explore a repeat-rich chromosome 1 region and its structural variation.',
    region: '1-2100000-2150000',
    haplotypes: true,
  },
  {
    title: 'AMY1A / AMY1B / AMY2A',
    category: 'Amylase locus',
    description:
      'Explore sequence variation at the amylase locus, an example of a copy-number-variable region.',
    region: '1-103600000-103650000',
    haplotypes: false,
  },
]

const LongReadHomePage = () => (
  <Page>
    <DocumentTitle title="Long-read beta" />
    <Hero>
      <GnomadLogo width="180px" />
      <Beta>LONG READ · BETA</Beta>
      <p>
        Explore long-read variants, tandem repeats, and local haplotypes in gnomAD. This beta
        browser is a preview; data and features are under active development.
      </p>
      <Searchbox width="100%" />
      <p>
        Search starts with the long-read callset. Use the dataset selector to explore other
        releases.
      </p>
    </Hero>

    <Examples aria-labelledby="lr-examples-heading">
      <h2 id="lr-examples-heading">example regions</h2>
      <Grid>
        {featuredRegions.map((example) => (
          <Card key={example.region}>
            <Category>{example.category}</Category>
            <h3>
              <Link
                preserveSelectedDataset={false}
                to={`/region/${example.region}?dataset=gnomad_r4_lr${
                  example.haplotypes ? '&show_haplotypes=true' : ''
                }`}
              >
                {example.title}
              </Link>
            </h3>
            <p>{example.description}</p>
            <code>{example.region}</code>
          </Card>
        ))}
      </Grid>
      <Link preserveSelectedDataset={false} to="/long-read-examples">
        Long-read example regions
      </Link>
    </Examples>

    <p style={{ marginTop: '32px' }}>
      Learn more <Link to="/about">about gnomAD</Link>, read our{' '}
      <Link to="/publications">publications</Link>, or visit <Link to="/help">browser help</Link>.
    </p>
  </Page>
)

export default LongReadHomePage
