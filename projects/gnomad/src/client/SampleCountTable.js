import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@broad/ui'

import sampleCounts from './sampleCounts'

const populationNames = {
  afr: 'African/African American',
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
`

export default () => (
  <div>
    <TableViewport>
      <BaseTable>
        <thead>
          <tr>
            <th rowSpan={2} scope="col">
              Population
            </th>
            <th colSpan={2} scope="col">
              gnomAD
            </th>
            <th colSpan={2} scope="col">
              controls
            </th>
            <th colSpan={2} scope="col">
              non-cancer
            </th>
            <th colSpan={2} scope="col">
              non-neuro
            </th>
            <th colSpan={2} scope="col">
              non-TOPMed
            </th>
          </tr>
          <tr>
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
          {['afr', 'amr', 'asj', 'eas', 'fin', 'nfe', 'sas', 'oth'].map(popId => (
            <tr key={popId}>
              <th scope="row">{populationNames[popId]}</th>
              <td>{sampleCounts.gnomad_r2_1.exomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1.genomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_controls.exomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_controls.genomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_non_cancer.exomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_non_cancer.genomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_non_neuro.exomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_non_neuro.genomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_non_topmed.exomes[popId]}</td>
              <td>{sampleCounts.gnomad_r2_1_non_topmed.genomes[popId]}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{sampleCounts.gnomad_r2_1.exomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1.genomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_controls.exomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_controls.genomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_non_cancer.exomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_non_cancer.genomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_non_neuro.exomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_non_neuro.genomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_non_topmed.exomesTotal}</td>
            <td>{sampleCounts.gnomad_r2_1_non_topmed.genomesTotal}</td>
          </tr>
        </tfoot>
      </BaseTable>
    </TableViewport>
    <p>
      * For genomes, we have a total of only 31 South Asian samples so they are grouped with Other.
    </p>
  </div>
)
