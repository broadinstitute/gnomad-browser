import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

import { BaseTable, Select } from '@gnomad/ui'

import rawHaplogroupAndAncestryData from './how-many-samples-are-in-each-mtdna-haplogroup-for-each-nuclear-ancestry-population.json'

const haplogroupAndAncestryData = rawHaplogroupAndAncestryData.data.map((row) => {
  const [haplogroup, ancestry, n] = row.split(' ')
  return { haplogroup, ancestry, n }
})

const codeToHaplogroupName = {
  afr: 'African/African American',
  ami: 'Amish',
  amr: 'Latino/Admixed American',
  asj: 'Ashkenazi Jewish',
  eas: 'East Asian',
  fin: 'European (Finnish)',
  mid: 'Middle Eastern',
  nfe: 'European (non-Finnish)',
  oth: 'Other',
  sas: 'South Asian',
}

const HaplogroupAndAncestryBaseTable = styled(BaseTable)`
  margin-top: 1em;
  margin-bottom: 1em;

  td {
    text-align: right;
  }
`

const HaplogroupOrAncestrySelector = styled(Select)`
  margin: 1em 1em 0 0;
`

const HaplogroupAndAncestryFilterTable = () => {
  const [haplogroupSelected, setHaplogroupSelected] = useState('All')
  const [ancestrySelected, setAncestrySelected] = useState('All')
  const [filteredData, setFilteredData] = useState([])
  const haplogroupOptions = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'HV',
    'I',
    'J',
    'K',
    'L0',
    'L1',
    'L2',
    'L3',
    'L4',
    'L5',
    'M',
    'N',
    'P',
    'R',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
  ]
  const ancestryOptions = [
    'African/African American',
    'Amish',
    'Latino/Admixed American',
    'Ashkenazi Jewish',
    'East Asian',
    'European (Finnish)',
    'Middle Eastern',
    'European (non-Finnish)',
    'South Asian',
    'Other',
  ]

  useEffect(() => {
    const newFilteredData = haplogroupAndAncestryData.filter((row) => {
      return (
        (row.haplogroup === haplogroupSelected || haplogroupSelected === 'All') &&
        (codeToHaplogroupName[row.ancestry] === ancestrySelected || ancestrySelected === 'All')
      )
    })
    setFilteredData(newFilteredData)
  }, [haplogroupSelected, ancestrySelected])

  return (
    <>
      <HaplogroupOrAncestrySelector
        id="haplogroup-selected"
        value={haplogroupSelected}
        onChange={(e) => {
          setHaplogroupSelected(e.target.value)
        }}
      >
        <optgroup label="Haplogroup">
          <option value="All" key="All">
            All Haplogroups
          </option>
          {haplogroupOptions.map((haplogroup) => (
            <option value={haplogroup} key={haplogroup}>
              {haplogroup}
            </option>
          ))}
        </optgroup>
      </HaplogroupOrAncestrySelector>

      <HaplogroupOrAncestrySelector
        id="ancestry-selected"
        value={ancestrySelected}
        onChange={(e) => {
          setAncestrySelected(e.target.value)
        }}
      >
        <optgroup label="Ancestry">
          <option value="All" key="All">
            All Ancestries
          </option>
          {ancestryOptions.map((ancestry) => (
            <option value={ancestry} key={ancestry}>
              {ancestry}
            </option>
          ))}
        </optgroup>
      </HaplogroupOrAncestrySelector>

      <HaplogroupAndAncestryBaseTable>
        <thead>
          <tr>
            <th scope="col">Haplogroup</th>
            <th scope="col">Population</th>
            <th scope="col">Number of Samples</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row) => {
            return (
              <tr key={row.haplogroup + row.ancestry}>
                <th scope="row">{row.haplogroup}</th>
                <th>{codeToHaplogroupName[row.ancestry]}</th>
                <td>{row.n}</td>
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr>
            <th scope="row">Haplogroup: {haplogroupSelected}</th>
            <th>Ancestry: {ancestrySelected}</th>
            <td>
              Samples:{' '}
              {filteredData.reduce((acc, row) => {
                return acc + parseInt(row.n, 10)
              }, 0)}
            </td>
          </tr>
        </tfoot>
      </HaplogroupAndAncestryBaseTable>
    </>
  )
}

export const question =
  'How many samples are in each mtDNA haplogroup, for each nuclear ancestry population?'

export const renderAnswer = () => <HaplogroupAndAncestryFilterTable />
