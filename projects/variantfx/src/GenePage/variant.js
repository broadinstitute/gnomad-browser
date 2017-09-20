import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { currentVariantData } from '@broad/gene-page/src/resources/variants'

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

const Table = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const TableRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 30px;
  font-size: 14px;
  border-bottom: 1px solid lightgrey;
`

const TableHeader = TableRow.extend`
  font-weight: bold;
  border-bottom: 1px solid black;
  padding-bottom: 5px;
`

const TableCell = styled.div`
  width: 100px;
`

const TableTitleColumn = TableCell.extend`
  width: 150px;

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
      <Table>
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
