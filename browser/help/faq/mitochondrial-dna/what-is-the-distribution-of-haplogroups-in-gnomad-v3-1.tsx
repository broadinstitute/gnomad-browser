import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@gnomad/ui'

const HaplogroupLineageTable = styled(BaseTable)`
  margin-bottom: 1em;

  td {
    text-align: right;
  }
`

const HaplogroupLineageTables = () => {
  return (
    <>
      <h4>N lineages (&quot;Eurasian&quot;)</h4>
      <HaplogroupLineageTable>
        <thead>
          <tr>
            <th scope="col">Haplogroup</th>
            <th scope="col">Number of samples</th>
            <th scope="col">Percent of total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">H</th>
            <td>14784</td>
            <td>26%</td>
          </tr>
          <tr>
            <th scope="row">U</th>
            <td>6037</td>
            <td>11%</td>
          </tr>
          <tr>
            <th scope="row">J</th>
            <td>3144</td>
            <td>6%</td>
          </tr>
          <tr>
            <th scope="row">T</th>
            <td>3080</td>
            <td>5%</td>
          </tr>
          <tr>
            <th scope="row">K</th>
            <td>2732</td>
            <td>5%</td>
          </tr>
          <tr>
            <th scope="row">A</th>
            <td>2680</td>
            <td>5%</td>
          </tr>
          <tr>
            <th scope="row">B</th>
            <td>1537</td>
            <td>3%</td>
          </tr>
          <tr>
            <th scope="row">V</th>
            <td>1234</td>
            <td>2%</td>
          </tr>
          <tr>
            <th scope="row">I</th>
            <td>934</td>
            <td>2%</td>
          </tr>
          <tr>
            <th scope="row">W</th>
            <td>819</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">HV</th>
            <td>701</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">X</th>
            <td>546</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">R</th>
            <td>393</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">N</th>
            <td>366</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">F</th>
            <td>282</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">Y</th>
            <td>12</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">P </th>
            <td>7</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">S </th>
            <td>0</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">O </th>
            <td>0</td>
            <td>0%</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">All N lineages</th>
            <td>39288</td>
            <td>70%</td>
          </tr>
        </tfoot>
      </HaplogroupLineageTable>

      <h4>L lineages (&quot;African&quot;)</h4>
      <HaplogroupLineageTable>
        <thead>
          <tr>
            <th scope="col">Haplogroup</th>
            <th scope="col">Number of samples</th>
            <th scope="col">Percent of total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">L3</th>
            <td>5672</td>
            <td>10%</td>
          </tr>
          <tr>
            <th scope="row">L2</th>
            <td>4724</td>
            <td>8%</td>
          </tr>
          <tr>
            <th scope="row">L1</th>
            <td>2977</td>
            <td>5%</td>
          </tr>
          <tr>
            <th scope="row">L0</th>
            <td>663</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">L4</th>
            <td>126</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">L5</th>
            <td>1</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">L6</th>
            <td>0</td>
            <td>0%</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">All L lineages</th>
            <td>14163</td>
            <td>25%</td>
          </tr>
        </tfoot>
      </HaplogroupLineageTable>

      <h4>M lineages (&quot;Asian&quot;)</h4>
      <HaplogroupLineageTable>
        <thead>
          <tr>
            <th scope="col">Haplogroup</th>
            <th scope="col">Number of samples</th>
            <th scope="col">Percent of total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">M</th>
            <td>1298</td>
            <td>2%</td>
          </tr>
          <tr>
            <th scope="row">C</th>
            <td>868</td>
            <td>2%</td>
          </tr>
          <tr>
            <th scope="row">D</th>
            <td>603</td>
            <td>1%</td>
          </tr>
          <tr>
            <th scope="row">G</th>
            <td>91</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">Z</th>
            <td>89</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">E</th>
            <td>34</td>
            <td>0%</td>
          </tr>
          <tr>
            <th scope="row">Q</th>
            <td>0</td>
            <td>0%</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">All M lineages</th>
            <td>2983</td>
            <td>5%</td>
          </tr>
        </tfoot>
      </HaplogroupLineageTable>
    </>
  )
}

export const question = 'What is the distribution of haplogroups in gnomAD v3.1?'

export const renderAnswer = () => <HaplogroupLineageTables />
