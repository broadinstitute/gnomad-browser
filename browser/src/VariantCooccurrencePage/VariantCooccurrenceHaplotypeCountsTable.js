import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { parseVariantId } from '@gnomad/identifiers'

import Link from '../Link'

const Table = styled.table`
  border-collapse: collapse;
  border-spacing: 0;

  td,
  th {
    padding: 0.5em 10px;
  }

  td {
    text-align: right;
  }
`

const truncate = (str, maxLength = 5) => {
  if (str.length > maxLength - 1) {
    return `${str.slice(0, maxLength - 1)}\u2026`
  }
  return str
}

const VariantCooccurrenceHaplotypeCountsTable = ({ variantIds, haplotypeCounts }) => {
  const variant1 = parseVariantId(variantIds[0])
  const variant2 = parseVariantId(variantIds[1])

  // haplotypeCounts: ref/ref alt/ref ref/alt alt/alt
  return (
    <div>
      <Table>
        <colgroup span="2" />
        <colgroup span="2" />
        <thead>
          <tr>
            <td colSpan={2} />
            <th colSpan={2} scope="colgroup">
              <Link to={`/variant/${variantIds[1]}`}>
                {variant2.chrom}-{variant2.pos}-{truncate(variant2.ref)}-{truncate(variant2.alt)}
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} />
            <th scope="col">{truncate(variant2.ref)}</th>
            <th scope="col">{truncate(variant2.alt)}</th>
          </tr>
          <tr>
            <th rowSpan={2} scope="rowgroup">
              <Link to={`/variant/${variantIds[0]}`}>
                {variant1.chrom}-{variant1.pos}-{truncate(variant1.ref)}-{truncate(variant1.alt)}
              </Link>
            </th>
            <th scope="row">{truncate(variant1.ref)}</th>
            <td>{Number(haplotypeCounts[0].toFixed(1)).toLocaleString()}</td>
            <td>{Number(haplotypeCounts[1].toFixed(1)).toLocaleString()}</td>
          </tr>
          <tr>
            <th scope="row">{truncate(variant1.alt)}</th>
            <td>{Number(haplotypeCounts[2].toFixed(1)).toLocaleString()}</td>
            <td>{Number(haplotypeCounts[3].toFixed(1)).toLocaleString()}</td>
          </tr>
        </tbody>
      </Table>
    </div>
  )
}

VariantCooccurrenceHaplotypeCountsTable.propTypes = {
  variantIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  haplotypeCounts: PropTypes.arrayOf(PropTypes.number).isRequired,
}

export default VariantCooccurrenceHaplotypeCountsTable
