import React from 'react'
import styled from 'styled-components'

import { BaseTable, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import Link from '../Link'

import { NonCodingConstraint } from '../VariantPage/VariantPage'
import { renderRoundedNumber } from './constraintMetrics'

import { regionColor, Legend } from '../RegionalGenomicConstraintTrack'

const Table = styled(BaseTable)`
  width: 100%;
  margin-top: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 600px) {
    td,
    th {
      padding-right: 10px;
    }
  }
`

const ViewSurroundingRegion = styled.div`
  margin-top: 1rem;
`

type Props = {
  variantId: string
  chrom: string
  nonCodingConstraint: NonCodingConstraint | null
}

const GnomadNonCodingConstraintTableVariant = ({
  variantId,
  chrom,
  nonCodingConstraint,
}: Props) => {
  if (nonCodingConstraint === null) {
    return <>This variant does not have non coding constraint data for the surrounding region.</>
  }

  const regionBuffer = 20_000
  const variantLocation = parseInt(variantId.split('-')[1], 10)
  const surroundingLocation = `${chrom}-${variantLocation - regionBuffer}-${
    variantLocation + regionBuffer
  }`

  return (
    <>
      <div>
        <p>{`Genomic constraint values displayed are for the region: ${chrom}-${nonCodingConstraint.start}-${nonCodingConstraint.stop}`}</p>
        <p>
          <a href="https://gnomad.broadinstitute.org/news/2022-10-the-addition-of-a-genomic-constraint-metric-to-gnomad/">
            Read more
          </a>{' '}
          about this constraint.
        </p>
      </div>
      <Table>
        <thead>
          <tr>
            <th scope="col">
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="The expected number of variants is predicted using an improved mutational model that takes into account both local sequence context and a variety of genomic features.">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Expected</TooltipHint>
              </TooltipAnchor>
            </th>
            <th scope="col">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="The observed number of variants is the count of rare (MAF<=1%) varaints in this 1kb window as identified in gnomAD v3.1.2">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Observed</TooltipHint>
              </TooltipAnchor>
            </th>
            <th scope="col">Constraint</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{renderRoundedNumber(nonCodingConstraint.expected)}</td>
            <td>{nonCodingConstraint.observed}</td>
            <td>
              Z ={' '}
              {renderRoundedNumber(nonCodingConstraint.z, {
                precision: 2,
                tooltipPrecision: 3,
                highlightColor: regionColor(nonCodingConstraint),
              })}
              <br />
              o/e ={' '}
              {renderRoundedNumber(nonCodingConstraint.oe, {
                precision: 2,
                tooltipPrecision: 3,
                highlightColor: null,
              })}
            </td>
          </tr>
        </tbody>
      </Table>
      <Legend />
      <ViewSurroundingRegion>
        <p>
          {`View the genomic constraint values for the ${
            (regionBuffer * 2) / 1000
          }kb region surrounding this variant: `}
          <Link to={{ pathname: `/region/${surroundingLocation}`, search: `variant=${variantId}` }}>
            {surroundingLocation}
          </Link>
        </p>
      </ViewSurroundingRegion>
    </>
  )
}

export default GnomadNonCodingConstraintTableVariant
