import React from 'react'
import styled from 'styled-components'

import { Badge, TooltipAnchor, TooltipHint } from '@gnomad/ui'

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

type Props = {
  variant: {
    chrom: string
    coverage: {
      exome?: {
        mean?: number
      }
    }
    exome: {
      filters: string[]
      ac: number
      an: number
      ac_hom: number
      ac_hemi?: number
    }
  }
}

const ExacVariantOccurrenceTable = ({ variant }: Props) => {
  // Display a warning if a variant's AN is < 50% of the max AN.
  // Max AN is 2 * sample count, so 50% max AN is equal to sample count.
  const hasLowAlleleNumber = variant.exome.an < sampleCounts.exac.total

  const coverage = (variant.coverage.exome || { mean: null }).mean

  return (
    <div>
      <Table>
        <tbody>
          <tr>
            <td />
            <th scope="col">Exomes</th>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Quality control filters that this variant failed (if any)">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Filters</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>
              {variant.exome.filters.length === 0 ? (
                <Badge level="success">Pass</Badge>
              ) : (
                // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type '"AC0" | "... Remove this comment to see the full error message
                variant.exome.filters.map((filter) => <QCFilter key={filter} filter={filter} />)
              )}
            </td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele count in high quality genotypes">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Allele Count</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.exome.ac}</td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Total number of called high quality genotypes">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Allele Number</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>
              {variant.exome.an}
              {hasLowAlleleNumber && ' *'}
            </td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele frequency in high quality genotypes">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Allele Frequency</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>
              {variant.exome.an === 0 ? 0 : (variant.exome.ac / variant.exome.an).toPrecision(4)}
            </td>
          </tr>
          {variant.chrom !== 'Y' && (
            <tr>
              <th scope="row">
                {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
                <TooltipAnchor tooltip="Number of individuals homozygous for alternate allele">
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <TooltipHint>Number of homozygotes</TooltipHint>
                </TooltipAnchor>
              </th>
              <td>{variant.exome.ac_hom}</td>
            </tr>
          )}
          {(variant.chrom === 'X' || variant.chrom === 'Y') && (
            <tr>
              <th scope="row">
                {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
                <TooltipAnchor tooltip="Number of individuals hemizygous for alternate allele">
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <TooltipHint>Number of hemizygotes</TooltipHint>
                </TooltipAnchor>
              </th>
              <td>{variant.exome.ac_hemi}</td>
            </tr>
          )}
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Mean depth of coverage at this variant's locus">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Mean depth of coverage</TooltipHint>
              </TooltipAnchor>
            </th>
            {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
            <td>{coverage !== null ? coverage.toFixed(1) : '–'}</td>
          </tr>
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

export default ExacVariantOccurrenceTable
