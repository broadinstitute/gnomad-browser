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

const truncate = (str: any, maxLength = 5) => {
  if (str.length > maxLength - 1) {
    return `${str.slice(0, maxLength - 1)}\u2026`
  }
  return str
}

type VariantCooccurrenceHaplotypeCountsTableProps = {
  variantIds: string[]
  haplotypeCounts: number[]
}

const VariantCooccurrenceHaplotypeCountsTable = ({
  variantIds,
  haplotypeCounts,
}: VariantCooccurrenceHaplotypeCountsTableProps) => {
  const variant1 = parseVariantId(variantIds[0])
  const variant2 = parseVariantId(variantIds[1])

  // haplotypeCounts: ref/ref alt/ref ref/alt alt/alt
  return (
    <div>
      <Table>
        {/* @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'number'. */}
        <colgroup span="2" />
        {/* @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'number'. */}
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

export default VariantCooccurrenceHaplotypeCountsTable
