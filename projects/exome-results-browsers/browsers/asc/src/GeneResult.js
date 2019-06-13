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
          <th scope="row">De novo protein-truncating variants</th>
          <td>{geneResult.xcase_dn_ptv === null ? '—' : geneResult.xcase_dn_ptv}</td>
          <td>{geneResult.xcont_dn_ptv === null ? '—' : geneResult.xcont_dn_ptv}</td>
        </tr>
        <tr>
          <th scope="row">De novo missense variants with MPC 1-2</th>
          <td>{geneResult.xcase_dn_misa === null ? '—' : geneResult.xcase_dn_misa}</td>
          <td>{geneResult.xcont_dn_misa === null ? '—' : geneResult.xcont_dn_misa}</td>
        </tr>
        <tr>
          <th scope="row">De novo missense variants with MPC &ge; 2</th>
          <td>{geneResult.xcase_dn_misb === null ? '—' : geneResult.xcase_dn_misb}</td>
          <td>{geneResult.xcont_dn_misb === null ? '—' : geneResult.xcont_dn_misb}</td>
        </tr>
        <tr>
          <th scope="row">
            Protein-truncating variants in iPSYCH (&quot;Danish Blood Spot&quot;) cohort
          </th>
          <td>{geneResult.xcase_dbs_ptv === null ? '—' : geneResult.xcase_dbs_ptv}</td>
          <td>{geneResult.xcont_dbs_ptv === null ? '—' : geneResult.xcont_dbs_ptv}</td>
        </tr>
        <tr>
          <th scope="row">Protein-truncating variants in Swedish cohort</th>
          <td>{geneResult.xcase_swe_ptv === null ? '—' : geneResult.xcase_swe_ptv}</td>
          <td>{geneResult.xcont_swe_ptv === null ? '—' : geneResult.xcont_swe_ptv}</td>
        </tr>
        <tr>
          <th scope="row">Protein-truncating variants transmitted/not transmitted to probands</th>
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
