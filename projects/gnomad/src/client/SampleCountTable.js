import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@broad/ui'

const sampleCounts = {
  gnomad: {
    exomes: {
      afr: 8128,
      amr: 17296,
      asj: 5040,
      eas: 9197,
      fin: 10824,
      nfe: 56885,
      sas: 15308,
      oth: 3070,
    },
    genomes: { afr: 4359, amr: 424, asj: 145, eas: 780, fin: 1738, nfe: 7718, sas: '*', oth: 544 },
  },
  controls: {
    exomes: {
      afr: 3582,
      amr: 8556,
      asj: 1160,
      eas: 4523,
      fin: 6697,
      nfe: 21384,
      sas: 7845,
      oth: 957,
    },
    genomes: { afr: 1287, amr: 123, asj: 19, eas: 458, fin: 581, nfe: 2762, sas: '*', oth: 212 },
  },
  noncancer: {
    exomes: {
      afr: 7451,
      amr: 17130,
      asj: 4786,
      eas: 8846,
      fin: 10816,
      nfe: 51377,
      sas: 15263,
      oth: 2810,
    },
    genomes: { afr: 4359, amr: 424, asj: 145, eas: 780, fin: 1738, nfe: 7718, sas: '*', oth: 544 },
  },
  nonneuro: {
    exomes: {
      afr: 8109,
      amr: 15262,
      asj: 3106,
      eas: 6708,
      fin: 8367,
      nfe: 44779,
      oth: 2433,
      sas: 15304,
    },
    genomes: { afr: 1694, amr: 277, asj: 123, eas: 780, fin: 582, nfe: 6813, sas: '*', oth: 367 },
  },
  nontopmed: {
    exomes: {
      afr: 6013,
      amr: 17229,
      asj: 4999,
      eas: 9195,
      fin: 10823,
      nfe: 55840,
      sas: 15308,
      oth: 3032,
    },
    genomes: { afr: 4278, amr: 405, asj: 69, eas: 761, fin: 1738, nfe: 5547, sas: '*', oth: 506 },
  },
}

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
              <td>{sampleCounts.gnomad.exomes[popId]}</td>
              <td>{sampleCounts.gnomad.genomes[popId]}</td>
              <td>{sampleCounts.controls.exomes[popId]}</td>
              <td>{sampleCounts.controls.genomes[popId]}</td>
              <td>{sampleCounts.noncancer.exomes[popId]}</td>
              <td>{sampleCounts.noncancer.genomes[popId]}</td>
              <td>{sampleCounts.nonneuro.exomes[popId]}</td>
              <td>{sampleCounts.nonneuro.genomes[popId]}</td>
              <td>{sampleCounts.nontopmed.exomes[popId]}</td>
              <td>{sampleCounts.nontopmed.genomes[popId]}</td>
            </tr>
          ))}
        </tbody>
      </BaseTable>
    </TableViewport>
    <p>
      * For genomes, we have a total of only 31 South Asian samples so they are grouped with Other.
    </p>
  </div>
)
