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
          <th scope="row">MPC</th>
          <td>{geneResult.xcase_mpc === null ? '—' : geneResult.xcase_mpc}</td>
          <td>{geneResult.xctrl_mpc === null ? '—' : geneResult.xctrl_mpc}</td>
          <td>{geneResult.pval_mpc === null ? '—' : geneResult.pval_mpc.toPrecision(3)}</td>
        </tr>
        <tr>
          <th scope="row">Inframe Indel</th>
          <td>{geneResult.xcase_infrIndel === null ? '—' : geneResult.xcase_infrIndel}</td>
          <td>{geneResult.xctrl_infrIndel === null ? '—' : geneResult.xctrl_infrIndel}</td>
          <td>
            {geneResult.pval_infrIndel === null ? '—' : geneResult.pval_infrIndel.toPrecision(3)}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Overall</th>
          <td />
          <td />
          <td>{geneResult.pval.toPrecision(3)}</td>
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
    xcase_mpc: PropTypes.number,
    xctrl_mpc: PropTypes.number,
    pval_mpc: PropTypes.number,
    xcase_infrIndel: PropTypes.number,
    xctrl_infrIndel: PropTypes.number,
    pval_infrIndel: PropTypes.number,
    pval: PropTypes.number.isRequired,
  }).isRequired,
}

export default GeneResultsTable
