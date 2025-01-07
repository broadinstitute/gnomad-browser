import React from 'react'
import styled from 'styled-components'
import { Link, PageHeading } from '@gnomad/ui'

// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import FederatedGnomadMap from '../about/federation/FederatedGnomadMap.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import AustralianGeneticDiversityDatabaseLogo from '../about/federation/AustralianGeneticDiversityDatabaseLogo.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import CanadaGnomadLogo from '../about/federation/CanadaGnomadLogo.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import ChinaGnomadLogo from '../about/federation/ChinaGnomadLogo.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import EuropeanGenomePhenomeArchiveLogo from '../about/federation/EuropeanGenomePhenomeArchiveLogo.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import InstituteForGenomicsStatisticsAndBioinformaticsLogo from '../about/federation/InsituteForGenomicsStatisticsAndBioinformaticsLogo.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import PrecisionHealthResearchSingaporeLogo from '../about/federation/PrecisionHealthResearchSingaporeLogo.png'
// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import QatarGenomeLogo from '../about/federation/QatarGenomeLogo.png'

// @ts-expect-error
import federationContent from '../about/federation/federation.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'
import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableBody,
} from '../src/StatsPage/StatsPageTables/TableStyles'

const CenteredContainer = styled.div`
  display: flex;
  justify-content: space-around;
`

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin: 2rem 0;
`

const SingleLogo = styled.img`
  width: 200px;
  height: auto;
`

const DoubleLogo = styled(SingleLogo)`
  width: 400px;
`

type Dataset = {
  country: string
  samples: string
  source: string
  lead: string
  link?: string
}

const datasets: Dataset[] = [
  {
    country: 'Africa',
    samples: 'TBD',
    source: 'African Genome Variation Database',
    lead: 'Nicky Mulder',
  },
  {
    country: 'Australia',
    samples: '10,000',
    source: 'Our DNA',
    link: 'https://populationgenomics.org.au/',
    lead: 'Daniel MacArthur',
  },
  {
    country: 'Brazil',
    samples: '21,000',
    source: 'Genomas SUS',
    lead: 'Leandro Colli',
  },
  {
    country: 'Canada',
    samples: '60,000',
    source: 'Canadian Genomic Data Commons',
    lead: 'Jordan Lerner-Ellis',
  },
  {
    country: 'China',
    samples: '10,000',
    source: 'China Kadoorie Biobank (>500K)',
    link: 'https://gnomad.org.cn',
    lead: 'Xiao Li',
  },
  {
    country: 'Europe',
    samples: 'TBD',
    source: 'European Genome Phenome Archive',
    link: 'https://ega-archive.org/',
    lead: 'Abeer Fadda',
  },
  {
    country: 'Europe',
    samples: '30,000',
    source: 'European Reference Network for Rare Neurological Diseases',
    link: 'https://www.ern-rnd.eu/',
    lead: 'Holm Graessner',
  },
  {
    country: 'Germany',
    samples: '10,000',
    source: 'Clinical sequencing',
    link: 'https://www.igsb.uni-bonn.de/en',
    lead: 'Peter Krawitz',
  },
  {
    country: 'Germany',
    samples: 'TBD',
    source: 'The German Human Genome-Phenome Archive (GHGA)',
    lead: 'Drew Behrens',
  },
  {
    country: 'Japan',
    samples: '100,000',
    source: 'Tomoku Medical Megabank Organization',
    link: 'https://www.megabank.tohoku.ac.jp/english/',
    lead: 'Soichi Ogishima',
  },
  {
    country: 'Qatar',
    samples: '25,000',
    source: 'Qatar Biobank',
    link: 'https://www.qphi.org.qa/',
    lead: 'Chadi Saad',
  },
  {
    country: 'Singapore',
    samples: '10,000',
    source: 'SG10K_Health data',
    link: 'https://www.a-star.edu.sg/gis/our-science/precision-medicine-and-population-genomics/npm',
    lead: 'Maxime Hebrard',
  },
  {
    country: 'Taiwan',
    samples: '1,500',
    source: 'Taiwan Biobank',
    link: 'https://genomes.tw/',
    lead: 'Jacob Shujui Hsu',
  },
  {
    country: 'UK',
    samples: '50,000',
    source:
      'Avon Longitudinal Study of Parents and Children (ALSPC), Born in Bradford, Millennium Cohort Study (MCS), Fenland Study',
    link: 'https://www.sanger.ac.uk/',
    lead: 'Vivek Iyer',
  },
]

export default () => (
  <InfoPage>
    <DocumentTitle title="Federated gnomAD" />
    <PageHeading>Federated gnomAD</PageHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: federationContent.html }} />

    <br />

    <CenteredContainer>
      <img
        src={FederatedGnomadMap}
        alt="Locations of federated gnomAD data sources on a world map."
        width="70%"
      />
    </CenteredContainer>

    <br />

    <CenteredContainer>
      <StatsTable>
        <thead>
          <StatsTableHeaderRow>
            <th>Country</th>
            <th>Samples</th>
            <th>Source</th>
            <th>Lead</th>
          </StatsTableHeaderRow>
        </thead>
        <StatsTableBody>
          {datasets.map((dataset) => {
            return (
              <tr key={dataset.source}>
                <td>{dataset.country}</td>
                <td>{dataset.samples}</td>
                <td>
                  {dataset.link ? (
                    // @ts-expect-error
                    <Link href={dataset.link}>{dataset.source}</Link>
                  ) : (
                    dataset.source
                  )}
                </td>
                <td>{dataset.lead}</td>
              </tr>
            )
          })}
        </StatsTableBody>
      </StatsTable>
    </CenteredContainer>

    <br />
    <br />

    <CenteredContainer>
      <LogoContainer>
        <SingleLogo alt="gnomAD Canada logo" src={CanadaGnomadLogo} />
        <SingleLogo alt="gnomAD China logo" src={ChinaGnomadLogo} />
        <SingleLogo
          alt="Australian Genetic Diversity Database logo"
          src={AustralianGeneticDiversityDatabaseLogo}
        />
        <DoubleLogo
          alt="Institute for Genomic Statics and Bioinformatics logo"
          src={InstituteForGenomicsStatisticsAndBioinformaticsLogo}
        />
      </LogoContainer>
    </CenteredContainer>
    <CenteredContainer>
      <LogoContainer>
        <SingleLogo
          alt="European Genome-Phenome Archive logo"
          src={EuropeanGenomePhenomeArchiveLogo}
        />
        <SingleLogo
          alt="Precision Health Research Singapore logo"
          src={PrecisionHealthResearchSingaporeLogo}
        />
        <DoubleLogo alt="Qatar Genome logo" src={QatarGenomeLogo} />
      </LogoContainer>
    </CenteredContainer>
  </InfoPage>
)
