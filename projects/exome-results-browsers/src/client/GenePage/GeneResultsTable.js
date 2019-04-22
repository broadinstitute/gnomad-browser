import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@broad/ui'

import browserConfig from '@browser/config'

const Table = styled(BaseTable)`
  min-width: 325px;
`

const GeneResultsTable = ({ geneResult }) => (
  <div>
    <Table>
      <thead>
        <tr>
          <th scope="col">Category</th>
          <th scope="col">Cases</th>
          <th scope="col">Controls</th>
          <th scope="col">P-Val</th>
        </tr>
      </thead>
      <tbody>
        {browserConfig.geneResults.categories.map(({ id, label }) => {
          const resultCategory = geneResult.categories.find(c => c.id === id)
          return (
            <tr key={id}>
              <th scope="row">{label}</th>
              <td>{resultCategory.xcase === null ? '—' : resultCategory.xcase}</td>
              <td>{resultCategory.xctrl === null ? '—' : resultCategory.xctrl}</td>
              <td>{resultCategory.pval === null ? '—' : resultCategory.pval.toPrecision(3)}</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Overall</th>
          <td />
          <td />
          <td>{geneResult.pval_meta.toPrecision(3)}</td>
        </tr>
      </tfoot>
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
    pval_meta: PropTypes.number.isRequired,
  }).isRequired,
}

export default GeneResultsTable
