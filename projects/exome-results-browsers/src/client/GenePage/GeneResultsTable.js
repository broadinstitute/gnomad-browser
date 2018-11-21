import PropTypes from 'prop-types'
import React from 'react'

import { BaseTable } from '@broad/ui'

const Table = BaseTable.extend`
  min-width: 325px;
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

GeneResultsTable.propTypes = {
  geneResult: PropTypes.shape({
    categories: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        xcase: PropTypes.number,
        xctrl: PropTypes.number,
        pval: PropTypes.number,
      })
    ),
  }).isRequired,
}

export default GeneResultsTable
