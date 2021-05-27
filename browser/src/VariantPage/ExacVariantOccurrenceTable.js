import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge } from '@gnomad/ui'

import sampleCounts from '@gnomad/dataset-metadata/sampleCounts'

import QCFilter from '../QCFilter'

const Table = styled.table`
  /* To vertically align with the right column's heading */
  margin-top: 1.25em;

  th {
    font-weight: bold;
  }

  th[scope='col'] {
    padding-left: 30px;
    text-align: left;
  }

  th[scope='row'] {
    text-align: right;
  }

  td {
    padding-left: 30px;
    line-height: 1.5;
  }
`

const ExacVariantOccurrenceTable = ({ variant }) => {
  // Display a warning if a variant's AN is < 50% of the max AN.
  // Max AN is 2 * sample count, so 50% max AN is equal to sample count.
  const hasLowAlleleNumber = variant.exome.an < sampleCounts.exac.total

  return (
    <div>
      <Table>
        <tbody>
          <tr>
            <td />
            <th scope="col">Exomes</th>
          </tr>
          <tr>
            <th scope="row">Filter</th>
            <td>
              {variant.exome.filters.length === 0 ? (
                <Badge level="success">Pass</Badge>
              ) : (
                variant.exome.filters.map(filter => <QCFilter key={filter} filter={filter} />)
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">Allele Count</th>
            <td>{variant.exome.ac}</td>
          </tr>
          <tr>
            <th scope="row">Allele Number</th>
            <td>
              {variant.exome.an}
              {hasLowAlleleNumber && ' *'}
            </td>
          </tr>
          <tr>
            <th scope="row">Allele Frequency</th>
            <td>
              {variant.exome.an === 0 ? 0 : (variant.exome.ac / variant.exome.an).toPrecision(4)}
            </td>
          </tr>
          {variant.chrom !== 'Y' && (
            <tr>
              <th scope="row">Number of homozygotes</th>
              <td>{variant.exome.ac_hom}</td>
            </tr>
          )}
          {(variant.chrom === 'X' || variant.chrom === 'Y') && (
            <tr>
              <th scope="row">Number of hemizygotes</th>
              <td>{variant.exome.ac_hemi}</td>
            </tr>
          )}
        </tbody>
      </Table>
      {hasLowAlleleNumber && (
        <p>
          <Badge level="warning">Warning</Badge> This variant is covered in fewer than 50% of
          individuals in ExAC. Allele frequency estimates may not be reliable.
        </p>
      )}
    </div>
  )
}

ExacVariantOccurrenceTable.propTypes = {
  variant: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    exome: PropTypes.shape({
      filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      ac_hemi: PropTypes.number,
    }).isRequired,
  }).isRequired,
}

export default ExacVariantOccurrenceTable
