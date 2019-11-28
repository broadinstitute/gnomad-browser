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
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">LoF</th>
          <td>{geneResult.x_case_lof === null ? '—' : geneResult.x_case_lof}</td>
          <td>{geneResult.x_ctrl_lof === null ? '—' : geneResult.x_ctrl_lof}</td>
        </tr>
        <tr>
          <th scope="row">Missense (MPC&nbsp;&ge;&nbsp;3)</th>
          <td>{geneResult.x_case_mis3 === null ? '—' : geneResult.x_case_mis3}</td>
          <td>{geneResult.x_ctrl_mis3 === null ? '—' : geneResult.x_ctrl_mis3}</td>
        </tr>
        <tr>
          <th scope="row">Missense (3&nbsp;&gt;&nbsp;MPC&nbsp;&ge;&nbsp;2)</th>
          <td>{geneResult.x_case_mis2 === null ? '—' : geneResult.x_case_mis2}</td>
          <td>{geneResult.x_ctrl_mis2 === null ? '—' : geneResult.x_ctrl_mis2}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">De Novo LoF</th>
          <td colSpan={2}>{geneResult.dn_lof === null ? '—' : geneResult.dn_lof}</td>
        </tr>
        <tr>
          <th scope="row">De Novo Missense</th>
          <td colSpan={2}>{geneResult.dn_mis === null ? '—' : geneResult.dn_mis}</td>
        </tr>
        <tr>
          <th scope="row">Meta-analysis P-value</th>
          <td colSpan={2}>
            {geneResult.pval_meta === null ? '—' : geneResult.pval_meta.toPrecision(3)}
          </td>
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
