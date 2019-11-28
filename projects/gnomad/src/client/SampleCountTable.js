import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@broad/ui'

import sampleCounts from './dataset-constants/sampleCounts'

const populationNames = {
  afr: 'African/African American',
  ami: 'Amish',
  amr: 'Latino',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  fin: 'Finnish',
  nfe: 'Non-Finnish European',
  sas: 'South Asian',
  oth: 'Other',
}

const TableViewport = styled.div`
  overflow-x: auto;
  width: 100%;
  margin-top: 1em;

  tbody tr:last-child {
    th,
    td {
      border-bottom-color: #000;
    }
  }
`

const SampleCountTable = () => (
  <div>
    <TableViewport>
      <BaseTable>
        <thead>
          <tr>
            <th rowSpan={2} scope="col">
              Population
            </th>
            <th scope="col">gnomAD v3</th>
            <th colSpan={2} scope="col">
              gnomAD v2
            </th>
            <th colSpan={2} scope="col">
              controls (v2)
            </th>
            <th colSpan={2} scope="col">
              non-cancer (v2)
            </th>
            <th colSpan={2} scope="col">
              non-neuro (v2)
            </th>
            <th colSpan={2} scope="col">
              non-TOPMed (v2)
            </th>
          </tr>
          <tr>
            <th scope="col">genomes</th>
            <th scope="col">exomes</th>
            <th scope="col">genomes</th>
            <th scope="col">exomes</th>
            <th scope="col">genomes</th>
            <th scope="col">exomes</th>
            <th scope="col">genomes</th>
            <th scope="col">exomes</th>
            <th scope="col">genomes</th>
            <th scope="col">exomes</th>
            <th scope="col">genomes</th>
          </tr>
        </thead>
        <tbody>
          {['afr', 'ami', 'amr', 'asj', 'eas', 'fin', 'nfe', 'sas', 'oth'].map(popId => (
            <tr key={popId}>
              <th scope="row">{populationNames[popId]}</th>
              <td>{(sampleCounts.gnomad_r3.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1.exomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_controls.exomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_controls.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_non_cancer.exomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_non_cancer.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_non_neuro.exomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_non_neuro.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_non_topmed.exomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r2_1_non_topmed.genomes[popId] || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tbody>
          {['female', 'male'].map(popId => (
            <tr key={popId}>
              <th scope="row">{popId.charAt(0).toUpperCase() + popId.slice(1)}</th>
              <td>{sampleCounts.gnomad_r3.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1.exomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_controls.exomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_controls.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_non_cancer.exomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_non_cancer.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_non_neuro.exomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_non_neuro.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_non_topmed.exomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r2_1_non_topmed.genomes[popId].toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{sampleCounts.gnomad_r3.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1.exomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_controls.exomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_controls.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_non_cancer.exomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_non_cancer.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_non_neuro.exomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_non_neuro.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_non_topmed.exomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r2_1_non_topmed.genomesTotal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </BaseTable>
    </TableViewport>
    <p>
      * For v2 genomes, we have a total of only 31 South Asian samples so they are grouped with
      Other.
    </p>
  </div>
)

export default SampleCountTable
