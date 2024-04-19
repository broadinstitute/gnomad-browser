import React from 'react'
import styled from 'styled-components'

import gnomadV4AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v4/ageDistribution.json'
import { ExternalLink, PageHeading } from '@gnomad/ui'

// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import BrowserPageviews from '../../about/stats/browser_pageviews.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import BrowserWorld from '../../about/stats/browser_world.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import DiversityBadge from '../../about/stats/diversity_badge.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import SnvsPerBPAvg from '../../about/stats/snvs_per_bp_avg.png'

import DocumentTitle from '../DocumentTitle'
import Histogram from '../Histogram'
import { SectionHeading } from '../help/HelpPage'
import InfoPage from '../InfoPage'
import Link from '../Link'

import gnomadExomeGenomeCountsByVersion from './BarGraphData/gnomADExomeGenomeCountsByVersion.json'
import gnomadV4GeneticAncestryCounts from './BarGraphData/gnomadV4GeneticAncestryCounts.json'
import gnomadV4GeneticDiversityCounts from './BarGraphData/gnomadV4GeneticDiversityCounts.json'
import NumberOfVariantsInGnomadList, { SectionList } from './NumberOfVariantsInGnomadList'
import StackedBarGraph from './StackedBarGraph'
import GeneticAncestryGroupsByVersionTable from './StatsPageTables/GeneticAncestryGroupsByVersionTable'
import V4GeneticAncestryTable from './StatsPageTables/V4GeneticAncestryTable'
import StudyDiseasesInGnomadTable from './StatsPageTables/StudyDiseasesInGnomadTable'

const TwoColumnLayout = styled.div`
  display: flex;
  justify-content: space-around;

  @media (max-width: 992px) {
    display: block;
  }
`

const ResponsiveHalfWidthColumn = styled.div`
  width: 50%;

  @media (max-width: 992px) {
    width: 100%;
  }
`

const ResponsiveGnomadSamplesContainer = styled.div`
  width: 70%;

  @media (max-width: 992px) {
    width: 100%;
  }
`

const DiversityBarGraphContainer = styled.div`
  display: flex;
  justify-content: space-around;

  @media (max-width: 992px) {
    display: block;
    width: 100%;
  }
`

const DiversityBarGraph = styled.div`
  width: 70%;

  @media (max-width: 992px) {
    display: block;
    width: 100%;
  }
`

const SexDistributionList = styled.div`
  width: 30%;

  @media (max-width: 992px) {
    width: 100%;
  }
`

const CenteredContainer = styled.div`
  display: flex;
  justify-content: space-around;
`

const ResponsiveTable = styled.div`
  display: flex;
  justify-content: space-around;

  @media (max-width: 992px) {
    display: block;
  }
`

const StatsSection = styled.div`
  margin-bottom: 5em;
`

const StatsHighlightColorBlock = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 200px;
  height: 200px;
  margin: 1em 0 2em 0;
  background-color: ${(props) => props.theme.color};
  color: white;
  border-radius: 1.5em;
  text-align: center;
`

const StatsHighlightTitle = styled.h1`
  margin: 0;
  font-size: 3.75em;
`

const StatsHighlightText = styled.p`
  margin: 0;
  font-size: 1.25em;
`

const CountriesColoredText = styled.span`
  color: #508a14;
  font-weight: bold;
`

const DiversityBarGraphTooltip = (row: any) => {
  return (
    <>
      <b>{row.label}</b>
      {/* eslint-disable dot-notation */}
      <div>{row['European'].toLocaleString()} European</div>
      <div>{row['Remaining'].toLocaleString()} Remaining</div>
      <div>{row['Ashkenazi Jewish'].toLocaleString()} Ashkenazi Jewish</div>
      <div>{row['Admixed American'].toLocaleString()} Admixed American</div>
      <div>{row['African'].toLocaleString()} African</div>
      <div>{row['Middle Eastern'].toLocaleString()} Middle Eastern</div>
      <div>{row['South Asian'].toLocaleString()} South Asian</div>
      <div>{row['East Asian'].toLocaleString()} East Asian</div>
      {/* eslint-enable dot-notation */}
    </>
  )
}

const StatsHighlightBlock = ({
  title,
  text,
  color,
}: {
  title: string
  text: string
  color: string
}) => {
  return (
    <StatsHighlightColorBlock theme={{ color }}>
      <div>
        <StatsHighlightTitle>{title}</StatsHighlightTitle>
        <StatsHighlightText>{text}</StatsHighlightText>
      </div>
    </StatsHighlightColorBlock>
  )
}

const gnomadBlue = '#0E6FBF'
const gnomadGreen = '#508A14'

const barGraphTooltip = (row: any) => (
  <>
    <b>{row.label}</b>
    <div>{row.Exomes.toLocaleString()} exomes</div>
    <div>{row.Genomes.toLocaleString()} genomes</div>
  </>
)

const StatsPage = () => {
  return (
    <InfoPage>
      <DocumentTitle title="Stats" />
      {/* @ts-expect-error */}
      <PageHeading id="gnomad-stats">What&apos;s in gnomAD</PageHeading>
      <div>
        <StatsSection style={{ marginTop: '2em' }}>
          <TwoColumnLayout>
            <div>
              <h2>gnomAD v4 includes 807,162 individuals</h2>
              <SectionList>
                <li>
                  730,947 <span style={{ color: gnomadBlue }}>exomes</span>
                  <SectionList>
                    <li>314,392 in the non-UKB subset</li>
                  </SectionList>
                </li>
                <li>
                  76,215 <span style={{ color: gnomadGreen }}>genomes</span>
                </li>
              </SectionList>
              <h2>v4 variants</h2>
              <NumberOfVariantsInGnomadList />
            </div>
            <ResponsiveHalfWidthColumn>
              <div style={{ marginTop: '4em', marginBottom: '7em', minWidth: '550px' }}>
                <StackedBarGraph
                  title="Sample size across major ExAC/gnomAD releases"
                  barColors={gnomadExomeGenomeCountsByVersion.colors}
                  barValues={gnomadExomeGenomeCountsByVersion.data}
                  height={400}
                  formatTooltip={barGraphTooltip}
                  xLabel=""
                  yLabel="Number of samples"
                  displayNumbers
                />
              </div>
              <CenteredContainer>
                <img
                  alt="2.9x increase in non-European individuals"
                  src={SnvsPerBPAvg}
                  width="250px"
                  height="250px"
                />
              </CenteredContainer>
            </ResponsiveHalfWidthColumn>
          </TwoColumnLayout>
        </StatsSection>

        <StatsSection>
          <SectionHeading id="age-and-sex-distribution">
            What is the age and sex distribution in gnomAD?
          </SectionHeading>
          <TwoColumnLayout>
            <ResponsiveGnomadSamplesContainer>
              <h3>Age</h3>
              <TwoColumnLayout>
                <ResponsiveHalfWidthColumn>
                  <p>Exomes</p>
                  <Histogram
                    // @ts-expect-error TS(2322) FIXME: Type '{ binEdges: any; binValues: any; nSmaller: a... Remove this comment to see the full error message
                    binEdges={gnomadV4AgeDistribution.exome.bin_edges}
                    binValues={gnomadV4AgeDistribution.exome.bin_freq}
                    nSmaller={gnomadV4AgeDistribution.exome.n_smaller}
                    nLarger={gnomadV4AgeDistribution.exome.n_larger}
                    barColor={gnomadBlue}
                    xLabel="Age"
                    yLabel="Individuals"
                    formatTooltip={(bin: any) =>
                      `${bin.label}: ${bin.value.toLocaleString()} individuals`
                    }
                  />
                </ResponsiveHalfWidthColumn>
                <ResponsiveHalfWidthColumn>
                  <p>Genomes</p>
                  <Histogram
                    // @ts-expect-error TS(2322) FIXME: Type '{ binEdges: any; binValues: any; nSmaller: a... Remove this comment to see the full error message
                    binEdges={gnomadV4AgeDistribution.genome.bin_edges}
                    binValues={gnomadV4AgeDistribution.genome.bin_freq}
                    nSmaller={gnomadV4AgeDistribution.genome.n_smaller}
                    nLarger={gnomadV4AgeDistribution.genome.n_larger}
                    barColor={gnomadGreen}
                    xLabel="Age"
                    yLabel="Individuals"
                    formatTooltip={(bin: any) =>
                      `${bin.label}: ${bin.value.toLocaleString()} individuals`
                    }
                  />
                </ResponsiveHalfWidthColumn>
              </TwoColumnLayout>
            </ResponsiveGnomadSamplesContainer>
            <SexDistributionList>
              <h3>Sex</h3>
              <ul>
                <li>406,265 XX individuals</li>
                <li>400,897 XY individuals</li>
              </ul>
            </SexDistributionList>
          </TwoColumnLayout>
          <p style={{ marginTop: '5em' }}>
            To learn more about how we calculate the sex and age distribution please see our{' '}
            <Link to="/help">FAQs</Link>
          </p>
        </StatsSection>

        <StatsSection>
          <SectionHeading id="samples">Where do gnomAD samples come from?</SectionHeading>
          <div style={{ width: '100%' }}>
            <TwoColumnLayout>
              <StatsHighlightBlock color={gnomadBlue} title="308" text="Data Contributors" />
              <StatsHighlightBlock
                color={gnomadGreen}
                title=">100"
                text="Studies from around the world"
              />
            </TwoColumnLayout>
          </div>
          <p>
            The gnomAD project brings in samples recruited for various studies based around the
            world. We are not always provided information about where samples are obtained, but we
            are often provided the country of the study&apos;s institutional review board (IRB).{' '}
          </p>
          <p>
            Version 4 of gnomAD contains samples with IRBs based in at least 25 different countries,
            including:{' '}
            <CountriesColoredText>
              Australia, Bangladesh, Belgium, Canada, China, England, Finland, France, Germany,
              Israel, Italy, Japan, Kenya, Korea, Lithuania, Mexico, Netherlands, Pakistan,
              Scotland, Singapore, Spain, Sweden, United Arab Emirates, United States, Wales.
            </CountriesColoredText>
          </p>
          <p>
            To see a list of studies included in gnomAD and data contributors please visit our{' '}
            <Link to="/about">about page</Link>.
          </p>
        </StatsSection>

        <StatsSection>
          <SectionHeading id="diversity">Diversity in gnomAD</SectionHeading>

          <h3 style={{ marginBottom: '2em' }}>Genetic Ancestry Groups in gnomAD by version</h3>

          <TwoColumnLayout style={{ marginBottom: '5em' }}>
            <img
              alt="2.9x increase in non-European individuals"
              src={DiversityBadge}
              width="275px"
            />
            <ResponsiveHalfWidthColumn>
              <p>
                We continue to improve the diversity of the genetic ancestry groups within gnomAD.
                While v4 does have some improvements we continue to strive to increase
                representation of historically underrepresented populations.
              </p>
              <p>
                To learn more about how we determine genetic ancestry groups please see our{' '}
                <Link to="help/ancestry">help page</Link> and{' '}
                {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                <ExternalLink href="https://gnomad.broadinstitute.org/news/2023-11-genetic-ancestry">
                  blog post
                </ExternalLink>{' '}
                on genetic ancestry.
              </p>
            </ResponsiveHalfWidthColumn>
          </TwoColumnLayout>

          <ResponsiveTable style={{ marginBottom: '3em' }}>
            <GeneticAncestryGroupsByVersionTable />
          </ResponsiveTable>

          <DiversityBarGraphContainer style={{ marginBottom: '0.5em', width: '100%' }}>
            <DiversityBarGraph style={{ marginTop: '1em', marginBottom: '1em' }}>
              <StackedBarGraph
                title="Per genetic ancestry group count of samples in gnomAD releases"
                barColors={gnomadV4GeneticAncestryCounts.colors}
                barValues={gnomadV4GeneticAncestryCounts.data}
                height={400}
                formatTooltip={DiversityBarGraphTooltip}
                xLabel=""
                yLabel="Number of samples"
                displayNumbers={false}
              />
            </DiversityBarGraph>
          </DiversityBarGraphContainer>

          <DiversityBarGraphContainer style={{ marginBottom: '0.5em' }}>
            <DiversityBarGraph style={{ marginTop: '1em', marginBottom: '0' }}>
              <StackedBarGraph
                title="Per genetic ancestry group count of non-synonymous coding variants in canonical transcripts with a overall gnomAD (within version) AF >0.1"
                barColors={gnomadV4GeneticDiversityCounts.colors}
                barValues={gnomadV4GeneticDiversityCounts.data}
                height={400}
                formatTooltip={DiversityBarGraphTooltip}
                xLabel=""
                yLabel="Number of samples"
                displayNumbers={false}
              />
            </DiversityBarGraph>
          </DiversityBarGraphContainer>
        </StatsSection>

        <StatsSection>
          <SectionHeading id="study-provided-labels">
            Study-provided labels and Genetic Ancestry Groups
          </SectionHeading>

          <p>
            The following table is provided in order to present how our inferred genetic ancestry
            groups correspond to descriptors provided by each contributing
            <Link to="/about"> study</Link>. The table below lists the total number of individuals
            in each genetic ancestry group and the percentage of samples per group with each
            study-provided descriptor.{' '}
          </p>
          <p>
            It is of note that imputed ancestry groups are genetically derived, while the
            study-provided labels are either self-reported or researcher assigned. As such, these
            values have no equivalency.
          </p>

          <ResponsiveTable>
            <V4GeneticAncestryTable />
          </ResponsiveTable>
        </StatsSection>

        <StatsSection>
          <SectionHeading id="study-diseases">Study Diseases in gnomAD</SectionHeading>

          <p style={{ marginBottom: '2em' }}>
            During the sample aggregation phase of v4 we began collecting study-disease of interest
            and case/control status at the individual level. This enabled us to provide a better
            sense of the phenotype breakdown in gnomAD (see table below). While we are provided high
            level study phenotype and case/control status for some exome samples,{' '}
            <b>we do not have comprehensive phenotype metadata for gnomAD samples</b> and many
            samples are now derived from large biobanks which can include individuals with disease.{' '}
          </p>

          <ResponsiveTable style={{ marginBottom: '3em' }}>
            <StudyDiseasesInGnomadTable />
          </ResponsiveTable>
        </StatsSection>

        <StatsSection>
          <SectionHeading id="browser">gnomAD Browser Stats</SectionHeading>
          <p>{`The gnomAD browser averages ~200,000 page views per week and had >377,000 unique users in the last year`}</p>
          <TwoColumnLayout>
            <ResponsiveHalfWidthColumn>
              <img alt="Browser weekly pageviews" src={BrowserPageviews} width="100%" />
            </ResponsiveHalfWidthColumn>
            <ResponsiveHalfWidthColumn>
              <img alt="Browser users location" src={BrowserWorld} width="100%" />
            </ResponsiveHalfWidthColumn>
          </TwoColumnLayout>
        </StatsSection>
      </div>
    </InfoPage>
  )
}

export default StatsPage
