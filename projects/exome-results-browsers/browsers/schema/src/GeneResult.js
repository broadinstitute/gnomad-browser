import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@broad/ui'

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
        <tr>
          <th scope="row">LoF</th>
          <td>{geneResult.xcase_lof === null ? '—' : geneResult.xcase_lof}</td>
          <td>{geneResult.xctrl_lof === null ? '—' : geneResult.xctrl_lof}</td>
          <td>{geneResult.pval_lof === null ? '—' : geneResult.pval_lof.toPrecision(3)}</td>
        </tr>
        <tr>
          <th scope="row">Missense</th>
          <td>{geneResult.xcase_mis === null ? '—' : geneResult.xcase_mis}</td>
          <td>{geneResult.xctrl_mis === null ? '—' : geneResult.xctrl_mis}</td>
          <td>{geneResult.pval_mis === null ? '—' : geneResult.pval_mis.toPrecision(3)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th colSpan={3} scope="row">
            Overall
          </th>
          <td>{geneResult.pval === null ? '—' : geneResult.pval.toPrecision(3)}</td>
        </tr>
        <tr>
          <th colSpan={3} scope="row">
            Meta
          </th>
          <td>{geneResult.pval_meta === null ? '—' : geneResult.pval_meta.toPrecision(3)}</td>
        </tr>
      </tfoot>
    </Table>
  </div>
)

GeneResultsTable.propTypes = {
  geneResult: PropTypes.shape({
    xcase_lof: PropTypes.number,
    xctrl_lof: PropTypes.number,
    pval_lof: PropTypes.number,
    xcase_mis: PropTypes.number,
    xctrl_mis: PropTypes.number,
    pval_mis: PropTypes.number,
    pval: PropTypes.number,
    pval_meta: PropTypes.number,
  }).isRequired,
}

export default GeneResultsTable
