import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'
import sampleCounts from '@gnomad/dataset-metadata/sampleCounts'

import TableWrapper from '../../../src/TableWrapper'

const SampleCountTable = styled(BaseTable)`
  td {
    text-align: right;
  }

  tbody tr:last-child {
    th,
    td {
      border-bottom-color: #000;
    }
  }
`

const SampleCountTables = () => (
  <div>
    <h4>gnomAD v3</h4>
    <TableWrapper>
      <SampleCountTable>
        <thead>
          <tr>
            <th rowSpan={2} scope="col">
              Population
            </th>
            <th scope="col">overall</th>
            <th scope="col">controls/biobanks</th>
            <th scope="col">non-cancer</th>
            <th scope="col">non-neuro</th>
            <th scope="col">non-TOPMed</th>
            <th scope="col">non-v2</th>
          </tr>
        </thead>
        <tbody>
          {['afr', 'ami', 'amr', 'asj', 'eas', 'fin', 'mid', 'nfe', 'sas', 'oth'].map((popId) => (
            <tr key={popId}>
              {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
              <th scope="row">{GNOMAD_POPULATION_NAMES[popId]}</th>
              <td>{(sampleCounts.gnomad_r3.genomes[popId] || 0).toLocaleString()}</td>
              <td>
                {(
                  sampleCounts.gnomad_r3_controls_and_biobanks.genomes[popId] || 0
                ).toLocaleString()}
              </td>
              <td>{(sampleCounts.gnomad_r3_non_cancer.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r3_non_neuro.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r3_non_topmed.genomes[popId] || 0).toLocaleString()}</td>
              <td>{(sampleCounts.gnomad_r3_non_v2.genomes[popId] || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tbody>
          {['XX', 'XY'].map((popId) => (
            <tr key={popId}>
              <th scope="row">{popId}</th>
              <td>{sampleCounts.gnomad_r3.genomes[popId].toLocaleString()}</td>
              <td>
                {sampleCounts.gnomad_r3_controls_and_biobanks.genomes[popId].toLocaleString()}
              </td>
              <td>{sampleCounts.gnomad_r3_non_cancer.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r3_non_neuro.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r3_non_topmed.genomes[popId].toLocaleString()}</td>
              <td>{sampleCounts.gnomad_r3_non_v2.genomes[popId].toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>{sampleCounts.gnomad_r3.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r3_controls_and_biobanks.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r3_non_cancer.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r3_non_neuro.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r3_non_topmed.genomesTotal.toLocaleString()}</td>
            <td>{sampleCounts.gnomad_r3_non_v2.genomesTotal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </SampleCountTable>
    </TableWrapper>

    <h4>gnomAD v2</h4>
    <TableWrapper>
      <SampleCountTable>
        <thead>
          <tr>
            <th rowSpan={2} scope="col">
              Population
            </th>
            <th colSpan={2} scope="col">
              overall
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
          {['afr', 'ami', 'amr', 'asj', 'eas', 'fin', 'nfe', 'sas', 'oth'].map((popId) => (
            <tr key={popId}>
              {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
              <th scope="row">{GNOMAD_POPULATION_NAMES[popId]}</th>
              <td>{(sampleCounts.gnomad_r2_1.exomes[popId] || 0).toLocaleString()}</td>
              <td>
                {popId === 'sas'
                  ? '*'
                  : (sampleCounts.gnomad_r2_1.genomes[popId] || 0).toLocaleString()}
              </td>
              <td>{(sampleCounts.gnomad_r2_1_controls.exomes[popId] || 0).toLocaleString()}</td>
              <td>
                {popId === 'sas'
                  ? '*'
                  : (sampleCounts.gnomad_r2_1_controls.genomes[popId] || 0).toLocaleString()}
              </td>
              <td>{(sampleCounts.gnomad_r2_1_non_cancer.exomes[popId] || 0).toLocaleString()}</td>
              <td>
                {popId === 'sas'
                  ? '*'
                  : (sampleCounts.gnomad_r2_1_non_cancer.genomes[popId] || 0).toLocaleString()}
              </td>
              <td>{(sampleCounts.gnomad_r2_1_non_neuro.exomes[popId] || 0).toLocaleString()}</td>
              <td>
                {popId === 'sas'
                  ? '*'
                  : (sampleCounts.gnomad_r2_1_non_neuro.genomes[popId] || 0).toLocaleString()}
              </td>
              <td>{(sampleCounts.gnomad_r2_1_non_topmed.exomes[popId] || 0).toLocaleString()}</td>
              <td>
                {popId === 'sas'
                  ? '*'
                  : (sampleCounts.gnomad_r2_1_non_topmed.genomes[popId] || 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tbody>
          {['XX', 'XY'].map((popId) => (
            <tr key={popId}>
              <th scope="row">{popId}</th>
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
      </SampleCountTable>
    </TableWrapper>
    <p>
      * For v2 genomes, we have a total of only 31 South Asian samples so they are grouped with
      Other.
    </p>
  </div>
)

export const question = 'What populations are represented in the gnomAD data?'

export const renderAnswer = () => <SampleCountTables />
