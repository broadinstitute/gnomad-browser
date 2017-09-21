import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { currentVariantData } from '@broad/gene-page/src/resources/variants'

import {
  Table,
  VerticalTextLabels,
  TableVerticalLabel,
  VerticalLabelText,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui/src/tables/SimpleTable'

import {
  processCardioVariant,
  POPULATIONS,
  COHORTS,
  DISEASES,
} from '../utilities'

const VariantContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 50px;
  margin-top: 50px;
`

const VariantTitle = styled.h1`

`

const AnnotationsWrapper = styled.div`

`

const VariantDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  width: 1050px;
`

const VariantAttributes = styled.div`
  display: flex;
  font-size: 16px;
  flex-direction: column;
  align-items: space-between;
  margin-top: 10px;
  margin-bottom: 10px;
`

const VariantAttribute = styled.div`
  margin-bottom: 2px;
`

const currentDisease = 'DCM'

const Variant = ({ variant }) => {
  if (!variant) {
    return <div />
  }
  const processedVariant = processCardioVariant(variant)
  return (
    <VariantContainer>
      <VariantTitle>{processedVariant.variant_id}</VariantTitle>
      <VariantDetails>
        <VariantAttributes>
          <VariantAttribute>
            <strong>Filter:</strong> {processedVariant.filter}
          </VariantAttribute>
          <VariantAttribute>
            <strong>RSID:</strong> {processedVariant.rsid}
          </VariantAttribute>
          <VariantAttribute>
            <strong>HGVSc:</strong> {processedVariant.HGVSc}
          </VariantAttribute>
          <VariantAttribute>
            <strong>Consequence:</strong> {processedVariant.Consequence}
          </VariantAttribute>
        </VariantAttributes>
      </VariantDetails>
      <Table>
        <VerticalTextLabels>
          <TableVerticalLabel height={32}>
            <VerticalLabelText>
              {' '}
            </VerticalLabelText>
          </TableVerticalLabel>
          <TableVerticalLabel height={155}>
            <VerticalLabelText>
              HCM cases
            </VerticalLabelText>
          </TableVerticalLabel>
          <TableVerticalLabel height={35}>
            <VerticalLabelText>
              Controls
            </VerticalLabelText>
          </TableVerticalLabel>
        </VerticalTextLabels>
        <TableRows>
          <TableHeader>
            <TableTitleColumn>Cohort</TableTitleColumn>
            {Object.keys(POPULATIONS).map(pop => (
              <TableCell>{POPULATIONS[pop]}</TableCell>
            ))}
          </TableHeader>
          {Object.keys(COHORTS).map(cohort => (
            <TableRow>
              <TableTitleColumn><strong>{COHORTS[cohort]}</strong></TableTitleColumn>
              {Object.keys(POPULATIONS).map((pop) => {
                const popCounts = processedVariant
                  .diseases[currentDisease]
                  .cohorts[cohort]
                  .populations[pop]
                if (Object.keys(popCounts).length !== 0) {
                  if (popCounts.pop_freq !== undefined) {
                    return (
                      <TableCell>
                        {`${popCounts.pop_ac} (${popCounts.pop_freq.toPrecision(3)})`}
                      </TableCell>
                    )
                  }
                }
                return (
                  <TableCell>
                    ...
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
          <TableRow>
            <TableTitleColumn><strong>HVO (Healthy)</strong></TableTitleColumn>
            {Object.keys(POPULATIONS).map((pop) => {
              const popCounts = processedVariant
                .diseases['HVO']
                .cohorts['RBH']
                .populations[pop]
              if (Object.keys(popCounts).length !== 0) {
                if (popCounts.pop_freq !== undefined) {
                  return (
                    <TableCell>
                      {`${popCounts.pop_ac} (${popCounts.pop_freq.toPrecision(3)})`}
                    </TableCell>
                  )
                }
              }
              return (
                <TableCell>
                  ...
                </TableCell>
              )
            })}
          </TableRow>
          {/* <TableRow>
            <TableTitleColumn><strong>Gnomad</strong></TableTitleColumn>
            {Object.keys(POPULATIONS).map((pop) => {
              const popCounts = processedVariant
                .diseases['HVO']
                .cohorts['RBH']
                .populations[pop]
              if (Object.keys(popCounts).length !== 0) {
                if (popCounts.pop_freq !== undefined) {
                  return (
                    <TableCell>
                      {`${popCounts.pop_ac} (${popCounts.pop_freq.toPrecision(3)})`}
                    </TableCell>
                  )
                }
              }
              return (
                <TableCell>
                  ...
                </TableCell>
              )
            })}
          </TableRow> */}
        </TableRows>
      </Table>
    </VariantContainer>
  )
}
Variant.propTypes = {
  variant: PropTypes.object,
}

export default connect(
  state => ({
    variant: currentVariantData(state),
  })
)(Variant)
