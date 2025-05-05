import React from 'react'
import styled from 'styled-components'
import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableBody,
} from '../src/StatsPage/StatsPageTables/TableStyles'

const CenteredContainer = styled.div`
  display: flex;
  justify-content: space-around;
`

type Dataset = {
  resource: string
  description: string
}

const datasets: Dataset[] = [
  {
    resource: 'OurDNA flagship paper (forthcoming)',
    description: 'Methodologies, study design; pipeline parameters, data collection details.'
  },
  {
    resource: 'OurDNA dataset',
    description: 'Details on individual variants or genes; summary of population distributions; use of dataset for population programmatic annotation of OurDNA variants with global allele frequencies from gnomAD.'
  },
  {
    resource: 'OurDNA browser (software)',
    description: '        <td>Descriptions of software functionality; data access methods; comparisons of OurDNA browser to gnomAD browser; references to statistics or visualisations listed in the browser.'
  }
]

export default () => (
  <InfoPage>
    <DocumentTitle title="Publications" />
    <PageHeading>Publications</PageHeading>
    <p>
      {' '}   
       {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}         
      <ExternalLink href="https://ardc.edu.au/resource/data-and-software-citation/">
      Datasets and software are premier, citable research outputs
      </ExternalLink>. 
      There are several distinct outputs from the OurDNA program and we request that you cite the specific resource/s that have been used as input to your work. Please use Digital Object Identifiers (DOIs) in your citations to refer to definitive, persistent records of OurDNA resources. 
    </p>
    <br/>
    <CenteredContainer>
      <StatsTable>
        <thead>
          <StatsTableHeaderRow>
            <th>OurDNA resource</th>
            <th>Indicative citation use case</th>
          </StatsTableHeaderRow>
        </thead>
        <StatsTableBody>
          {datasets.map((dataset) => {
            return (
              <tr key={dataset.resource}>
                <td>{dataset.resource}</td>
                <td>{dataset.description}</td>
              </tr>
            )
          })}
        </StatsTableBody>
      </StatsTable>
    </CenteredContainer>

    <h2>Flagship paper</h2>

    <p>
      Publication of the OurDNA flagship paper is forthcoming. 
      <br/>
      <br/>
      We have a range of additional resources published in the{' '}
       {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://zenodo.org/communities/populationgenomics/records?q=&l=list&p=1&s=10&sort=newest">
      Centre for Populations Zenodo Community
      </ExternalLink>. 
    </p>

    <h2>Dataset</h2>
    <p>Example citation of dataset is forthcoming</p>

    <h2>Software</h2>
    <p>Example citation of software record is forthcoming</p>

  </InfoPage>
)
