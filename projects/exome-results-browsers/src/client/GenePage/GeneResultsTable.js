import React from 'react'
import styled from 'styled-components'

const Table = styled.table`
  border-collapse: collapse;
  border-spacing: 0;

  td,
  th {
    padding: 0.5em 20px 0.5em 0;
    text-align: left;
  }

  thead {
    th {
      border-bottom: 1px solid #000;
    }
  }

  tbody {
    td,
    th {
      border-bottom: 1px solid #ccc;
      font-weight: normal;
    }
  }
`

const GeneResultsTable = ({ geneResult }) => (
  <div>
    <Table>
      <thead>
        <tr>
          <th />
          <th>Cases</th>
          <th>Controls</th>
          <th>P-Val</th>
        </tr>
      </thead>
      <tbody>
        {BROWSER_CONFIG.geneResults.categories.map(({ id, label }) => {
          const resultCategory = geneResult.categories.find(c => c.id === id)
          return (
            <tr key={id}>
              <td>{label}</td>
              <td>{resultCategory.xcase === null ? '—' : resultCategory.xcase}</td>
              <td>{resultCategory.xctrl === null ? '—' : resultCategory.xctrl}</td>
              <td>{resultCategory.pval === null ? '—' : resultCategory.pval.toPrecision(3)}</td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  </div>
)

export default GeneResultsTable
