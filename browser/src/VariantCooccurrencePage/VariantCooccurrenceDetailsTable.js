import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { parseVariantId } from '@gnomad/identifiers'

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

const LegendSwatch = styled.span`
  position: relative;
  top: 2px;
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid #000;
  background: ${props => props.color};
`

const truncate = (str, maxLength = 5) => {
  if (str.length > maxLength - 1) {
    return `${str.slice(0, maxLength - 1)}\u2026`
  }
  return str
}

const DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR = 'rgb(255, 119, 114)'
const SAME_HAPLOTYPE_HIGHLIGHT_COLOR = 'rgb(0, 202, 235)'

const VariantCooccurrenceDetailsTable = ({ variantIds, genotypeCounts }) => {
  const variant1 = parseVariantId(variantIds[0])
  const variant2 = parseVariantId(variantIds[1])

  // genotypeCounts: ref_ref ref_het ref_hom het_ref het_het het_hom hom_ref hom_het hom_hom
  return (
    <div>
      <Table>
        <colgroup span="2" />
        <colgroup span="3" />
        <thead>
          <tr>
            <td colSpan={2} />
            <th colSpan={3} scope="colgroup">
              {variant2.chrom}-{variant2.pos}-{truncate(variant2.ref)}-{truncate(variant2.alt)}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={2} />
            <th scope="col">
              {truncate(variant2.ref)}/{truncate(variant2.ref)}
            </th>
            <th scope="col">
              {truncate(variant2.ref)}/{truncate(variant2.alt)}
            </th>
            <th scope="col">
              {truncate(variant2.alt)}/{truncate(variant2.alt)}
            </th>
          </tr>
          <tr>
            <th rowSpan={3} scope="rowgroup">
              {variant1.chrom}-{variant1.pos}-{truncate(variant1.ref)}-{truncate(variant1.alt)}
            </th>
            <th scope="row">
              {truncate(variant1.ref)}/{truncate(variant1.ref)}
            </th>
            <td>{genotypeCounts[0].toLocaleString()}</td>
            <td
              style={{
                background:
                  genotypeCounts[1] !== 0 ? DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR : undefined,
              }}
            >
              {genotypeCounts[1].toLocaleString()}
            </td>
            <td
              style={{
                background:
                  genotypeCounts[2] !== 0 ? DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR : undefined,
              }}
            >
              {genotypeCounts[2].toLocaleString()}
            </td>
          </tr>
          <tr>
            <th scope="row">
              {truncate(variant1.ref)}/{truncate(variant1.alt)}
            </th>
            <td
              style={{
                background:
                  genotypeCounts[3] !== 0 ? DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR : undefined,
              }}
            >
              {genotypeCounts[3].toLocaleString()}
            </td>
            <td
              style={{
                background: genotypeCounts[4] !== 0 ? SAME_HAPLOTYPE_HIGHLIGHT_COLOR : undefined,
              }}
            >
              {genotypeCounts[4].toLocaleString()}
            </td>
            <td>{genotypeCounts[5].toLocaleString()}</td>
          </tr>
          <tr>
            <th scope="row">
              {truncate(variant1.alt)}/{truncate(variant1.alt)}
            </th>
            <td
              style={{
                background:
                  genotypeCounts[6] !== 0 ? DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR : undefined,
              }}
            >
              {genotypeCounts[6].toLocaleString()}
            </td>
            <td>{genotypeCounts[7].toLocaleString()}</td>
            <td
              style={{
                background: genotypeCounts[8] !== 0 ? SAME_HAPLOTYPE_HIGHLIGHT_COLOR : undefined,
              }}
            >
              {genotypeCounts[8].toLocaleString()}
            </td>
          </tr>
        </tbody>
      </Table>
      <p>
        <LegendSwatch color={DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR} /> Samples that suggest variants
        appear on different haplotypes.
        <br />
        <LegendSwatch color={SAME_HAPLOTYPE_HIGHLIGHT_COLOR} /> Samples that suggest variants appear
        on the same haplotype.
      </p>
    </div>
  )
}

VariantCooccurrenceDetailsTable.propTypes = {
  variantIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  genotypeCounts: PropTypes.arrayOf(PropTypes.number).isRequired,
}

export default VariantCooccurrenceDetailsTable
