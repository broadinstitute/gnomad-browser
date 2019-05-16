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
          <th scope="row">De Novo PTV</th>
          <td>{geneResult.xcase_dn_ptv === null ? '—' : geneResult.xcase_dn_ptv}</td>
          <td>{geneResult.xcont_dn_ptv === null ? '—' : geneResult.xcont_dn_ptv}</td>
        </tr>
        <tr>
          <th scope="row">De Novo MisA</th>
          <td>{geneResult.xcase_dn_misa === null ? '—' : geneResult.xcase_dn_misa}</td>
          <td>{geneResult.xcont_dn_misa === null ? '—' : geneResult.xcont_dn_misa}</td>
        </tr>
        <tr>
          <th scope="row">De Novo MisB</th>
          <td>{geneResult.xcase_dn_misb === null ? '—' : geneResult.xcase_dn_misb}</td>
          <td>{geneResult.xcont_dn_misb === null ? '—' : geneResult.xcont_dn_misb}</td>
        </tr>
        <tr>
          <th scope="row">DBS PTV</th>
          <td>{geneResult.xcase_dbs_ptv === null ? '—' : geneResult.xcase_dbs_ptv}</td>
          <td>{geneResult.xcont_dbs_ptv === null ? '—' : geneResult.xcont_dbs_ptv}</td>
        </tr>
        <tr>
          <th scope="row">SWE PTV</th>
          <td>{geneResult.xcase_swe_ptv === null ? '—' : geneResult.xcase_swe_ptv}</td>
          <td>{geneResult.xcont_swe_ptv === null ? '—' : geneResult.xcont_swe_ptv}</td>
        </tr>
        <tr>
          <th scope="row">TUT</th>
          <td>{geneResult.xcase_tut === null ? '—' : geneResult.xcase_tut}</td>
          <td>{geneResult.xcont_tut === null ? '—' : geneResult.xcont_tut}</td>
        </tr>
      </tbody>
    </Table>
    <p>
      <strong>Q-Val:</strong> {geneResult.qval === null ? '—' : geneResult.qval.toPrecision(4)}
    </p>
  </div>
)

GeneResultsTable.propTypes = {
  geneResult: PropTypes.shape({
    xcase_dn_ptv: PropTypes.number,
    xcont_dn_ptv: PropTypes.number,
    xcase_dn_misa: PropTypes.number,
    xcont_dn_misa: PropTypes.number,
    xcase_dn_misb: PropTypes.number,
    xcont_dn_misb: PropTypes.number,
    xcase_dbs_ptv: PropTypes.number,
    xcont_dbs_ptv: PropTypes.number,
    xcase_swe_ptv: PropTypes.number,
    xcont_swe_ptv: PropTypes.number,
    xcase_tut: PropTypes.number,
    xcont_tut: PropTypes.number,
    qval: PropTypes.number,
  }).isRequired,
}

export default GeneResultsTable
