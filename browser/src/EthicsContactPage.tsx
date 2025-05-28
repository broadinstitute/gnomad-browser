import React from 'react'
import styled from 'styled-components'

import { PageHeading } from '@gnomad/ui'

// @ts-expect-error
import ethicsContent from '../about/policies/ethics-contact.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import {
  StatsTable,
  StatsTableHeaderRow,
  StatsTableBody,
} from '../src/StatsPage/StatsPageTables/TableStyles'
import MarkdownContent from './MarkdownContent'

const CenteredContainer = styled.div`
  display: flex;
  justify-content: space-around;
`

const EthicsContactPage = styled(InfoPage)`
  h2 {
    font-size: 1.5em;
    font-weight: bold;
  }

  h2:not(:first-child) {
    padding-top: 1.5rem;
  }
`
// TODO: formatting from 'MarkdownContent' breaks a-tags that link to a PDF loaded with
//   webpack, which is how the current Privacy Policy is being loaded.
//   Workaround for now to get this up for GCBR application, will review later.
const _PrivacyPolicyWrapper = styled.div`
  p {
    margin-top: 15px;
    margin-bottom: 15px;
    line-height: 1.4;
  }

  a {
    color: #428bca;
    text-decoration: none;
  }
`

type Dataset = {
  ethics: string
  referenceNumber: string
  datasets: string
}

const datasets: Dataset[] = [
  {
    ethics: "OurDNA program",
    referenceNumber: "HREC/91986/RCHM-2023",
    datasets: "OurDNA"
  },
  {
    ethics: "Large-scale genomic analysis of existing cohorts",
    referenceNumber: "HREC/84612/RCHM-2022",
    datasets: "BioHEART, Mackenzie's Mission, Tasmanian Ophthalmic Biobank Whole Genome Sequencing"
  },
  {
    ethics: "Aggregating and analysing data from existing cohort and biobank studies",
    referenceNumber: "2021/ETH00202",
    datasets: ""
  }
]

export default () => (
  <EthicsContactPage>
    <DocumentTitle title="Ethics Contact" />
    <PageHeading>Ethics Contact</PageHeading>
    <MarkdownContent dangerouslySetInnerHTML={{ __html: ethicsContent.html }} />
    <br/>
    <CenteredContainer>
      <StatsTable>
        <thead>
          <StatsTableHeaderRow>
            <th>Protocol name</th>
            <th>Ethics approval reference number</th>
            <th>Datasets</th>
          </StatsTableHeaderRow>
        </thead>
        <StatsTableBody>
          {datasets.map((dataset) => {
            return (
              <tr key={dataset.ethics}>
                <td>{dataset.ethics}</td>
                <td>{dataset.referenceNumber}</td>
                <td>{dataset.datasets}</td>
              </tr>
            )
          })}
        </StatsTableBody>
      </StatsTable>
    </CenteredContainer>

  </EthicsContactPage>
)
