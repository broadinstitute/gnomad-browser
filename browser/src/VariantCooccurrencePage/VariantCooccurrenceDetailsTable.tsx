import React from 'react'
import styled from 'styled-components'

import { parseVariantId } from '@gnomad/identifiers'

import Link from '../Link'

import { GenotypeCounts } from './VariantCooccurrencePage'

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
  background: ${(props: any) => props.color};
`

const truncate = (str: any, maxLength = 5) => {
  if (str.length > maxLength - 1) {
    return `${str.slice(0, maxLength - 1)}\u2026`
  }
  return str
}

const DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR = 'rgb(255, 119, 114)'
const SAME_HAPLOTYPE_HIGHLIGHT_COLOR = 'rgb(0, 202, 235)'
const INDETERMINATE_HIGHLIGHT_COLOR = 'rgb(191, 117, 240)'

type VariantCooccurrenceDetailsTableProps = {
  variantIds: string[]
  genotypeCounts: GenotypeCounts
}

const VariantCooccurrenceDetailsTable = ({
  variantIds,
  genotypeCounts,
}: VariantCooccurrenceDetailsTableProps) => {
  const variant1 = parseVariantId(variantIds[0])
  const variant2 = parseVariantId(variantIds[1])

  return (
    <div>
      <Table>
        {/* @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'number'. */}
        <colgroup span="2" />
        {/* @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'number'. */}
        <colgroup span="3" />
        <thead>
          <tr>
            <td colSpan={2} />
            <th colSpan={3} scope="colgroup">
              <Link to={`/variant/${variantIds[1]}`}>
                {variant2.chrom}-{variant2.pos}-{truncate(variant2.ref)}-{truncate(variant2.alt)}
              </Link>
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
              <Link to={`/variant/${variantIds[0]}`}>
                {variant1.chrom}-{variant1.pos}-{truncate(variant1.ref)}-{truncate(variant1.alt)}
              </Link>
            </th>
            <th scope="row">
              {truncate(variant1.ref)}/{truncate(variant1.ref)}
            </th>
            <td>{genotypeCounts.ref_ref.toLocaleString()}</td>
            <td
              style={{
                background: DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR,
              }}
            >
              {genotypeCounts.ref_het.toLocaleString()}
            </td>
            <td
              style={{
                background: DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR,
              }}
            >
              {genotypeCounts.ref_hom.toLocaleString()}
            </td>
          </tr>
          <tr>
            <th scope="row">
              {truncate(variant1.ref)}/{truncate(variant1.alt)}
            </th>
            <td
              style={{
                background: DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR,
              }}
            >
              {genotypeCounts.het_ref.toLocaleString()}
            </td>
            <td
              style={{
                background: INDETERMINATE_HIGHLIGHT_COLOR,
              }}
            >
              {genotypeCounts.het_het.toLocaleString()}
            </td>
            <td style={{ background: SAME_HAPLOTYPE_HIGHLIGHT_COLOR }}>
              {genotypeCounts.het_hom.toLocaleString()}
            </td>
          </tr>
          <tr>
            <th scope="row">
              {truncate(variant1.alt)}/{truncate(variant1.alt)}
            </th>
            <td
              style={{
                background: DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR,
              }}
            >
              {genotypeCounts.hom_ref.toLocaleString()}
            </td>
            <td style={{ background: SAME_HAPLOTYPE_HIGHLIGHT_COLOR }}>
              {genotypeCounts.hom_het.toLocaleString()}
            </td>
            <td
              style={{
                background: SAME_HAPLOTYPE_HIGHLIGHT_COLOR,
              }}
            >
              {genotypeCounts.hom_hom.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </Table>
      <p>
        <LegendSwatch color={DIFFERENT_HAPLOTYPES_HIGHLIGHT_COLOR} /> Samples consistent with
        variants appearing in isolation or on different haplotypes.
        <br />
        <LegendSwatch color={SAME_HAPLOTYPE_HIGHLIGHT_COLOR} /> Samples consistent with variants
        appearing on the same haplotype.
        <br />
        <LegendSwatch color={INDETERMINATE_HIGHLIGHT_COLOR} /> Samples consistent with either
        co-occurrence pattern.
      </p>
    </div>
  )
}

export default VariantCooccurrenceDetailsTable
