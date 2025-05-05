import React from 'react'
import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

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

    <table>
      <tr>
        <th>OurDNA Resource</th>
        <th>Indicative use case requiring citation</th>
      </tr>
      <tr>
        <td>OurDNA flagship paper (forthcoming)</td>
        <td>Methodologies, study design; pipeline parameters, data collection details.</td>
      </tr>
      <tr>
        <td>OurDNA dataset</td>
        <td>Details on individual variants or genes; summary of population distributions; use of dataset for population programmatic annotation of OurDNA variants with global allele frequencies from gnomAD.</td>
      </tr>
      <tr>
        <td>OurDNA browser (software)</td>
        <td>Descriptions of software functionality; data access methods; comparisons of OurDNA browser to gnomAD browser; references to statistics or visualisations listed in the browser.</td>
      </tr>
    </table>

    <h2>Flagship paper</h2>

    <p>
      Publication of the OurDNA flagship paper is forthcoming. 
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
