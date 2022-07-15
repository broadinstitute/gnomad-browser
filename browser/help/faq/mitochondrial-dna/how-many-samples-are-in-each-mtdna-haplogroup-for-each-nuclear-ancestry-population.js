import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

import { BaseTable, Select } from '@gnomad/ui'

import ancestryHaploData from './how-many-samples-are-in-each-mtdna-haplogroup-for-each-nuclear-ancestry-population.json'

const codeToWord = {
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

const HaplogroupAncestryTable = styled(BaseTable)`
  margin-top: 1em;
  margin-bottom: 1em;

  td {
    text-align: right;
  }
`

const HaploAncestrySelect = styled(Select)`
  margin: 1em 1em 0 0;
`

const AncestryAndHaplogroupTable = () => {
  const [haplogSelected, setHaplogSelected] = useState('All')
  const [ancestSelected, setAncestSelected] = useState('All')
  const [filteredData, setFilteredData] = useState(ancestryHaploData.data)
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
    const newFilteredData = ancestryHaploData.data.filter(element => {
      const splitElement = element.split(' ')
      return (
        (splitElement[0] === haplogSelected || haplogSelected === 'All') &&
        (codeToWord[splitElement[1]] === ancestSelected || ancestSelected === 'All')
      )
    })
    setFilteredData(newFilteredData)
  }, [haplogSelected, ancestSelected])

  return (
    <>
      <HaploAncestrySelect
        id="haplogroup-selected"
        value={haplogSelected}
        onChange={e => {
          setHaplogSelected(e.target.value)
        }}
      >
        <optgroup label="Haplogroup">
          <option value="All" key="All">
            All Haplogroups
          </option>
          {haplogroupOptions.map(haplogroup => (
            <option value={haplogroup} key={haplogroup}>
              {haplogroup}
            </option>
          ))}
        </optgroup>
      </HaploAncestrySelect>

      <Select
        id="ancestry-selected"
        value={ancestSelected}
        onChange={e => {
          setAncestSelected(e.target.value)
        }}
      >
        <optgroup label="Ancestry">
          <option value="All" key="All">
            All Ancestries
          </option>
          {ancestryOptions.map(ancest => (
            <option value={ancest} key={ancest}>
              {ancest}
            </option>
          ))}
        </optgroup>
      </Select>

      <HaplogroupAncestryTable>
        <thead>
          <tr>
            <th scope="col">Haplogroup</th>
            <th scope="col">Population</th>
            <th scope="col">Number of Samples</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map(el => {
            const splitData = el.split(' ')
            return (
              <tr key={splitData[0] + splitData[1]}>
                <th scope="row">{splitData[0]}</th>
                <th>{codeToWord[splitData[1]]}</th>
                <td>{splitData[2]}</td>
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr>
            <th scope="row">Haplogroup: {haplogSelected}</th>
            <th>Ancestry: {ancestSelected}</th>
            <td>
              Samples:{' '}
              {filteredData.reduce((acc, el) => {
                const splitEl = el.split(' ')
                return acc + parseInt(splitEl[2], 10)
              }, 0)}
            </td>
          </tr>
        </tfoot>
      </HaplogroupAncestryTable>
    </>
  )
}

export const question =
  'How many samples are in each mtDNA haplogroup, for each nuclear ancestry population?'

export const renderAnswer = () => <AncestryAndHaplogroupTable />
