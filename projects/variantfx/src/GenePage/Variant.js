import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import {
  allVariantsInCurrentDataset,
  hoveredVariant,
} from '@broad/redux-variants'

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
} from '@broad/ui'

import { currentDisease } from '../redux'

import {
  processCardioVariant,
  POPULATIONS,
  COHORTS,
} from '../utilities'

const VariantContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 50px;
  margin-top: 50px;
`

const VariantTitle = styled.h1`

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

const TableRowTotal = styled(TableRow)`
  border-top: 1px solid #000;
`

const VariantTableTitleColumn = styled(TableTitleColumn)`
  width: 120px;
`

const VariantTableCell = styled(TableCell)`
  width: 60px;
`

const Variant = ({ variant, currentDisease }) => {
  const cohorts = Object.keys(COHORTS).reduce((a, e) => ({[e]: {populations: POPULATIONS}, ...a}), {})
  const processedVariant = variant ? processCardioVariant(variant) : {diseases: {[currentDisease]: {cohorts}, HVO: {cohorts}}}
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
          <TableVerticalLabel height={125}>
            <VerticalLabelText>
              HCM cases
            </VerticalLabelText>
          </TableVerticalLabel>
          <TableVerticalLabel height={85}>
            <VerticalLabelText>
              Controls
            </VerticalLabelText>
          </TableVerticalLabel>
        </VerticalTextLabels>
        <TableRows>
          <TableHeader>
            <VariantTableTitleColumn>Cohort</VariantTableTitleColumn>
            {Object.keys(POPULATIONS).map(pop => (
              <VariantTableCell key={pop}>{POPULATIONS[pop]}</VariantTableCell>
            ))}
          </TableHeader>
          {['RBH', 'EGY', 'SGP', 'LMM', 'OMG'].map(cohort => (
            <TableRow key={cohort} style={{borderBottomColor: cohort === 'OMG' ? 'black': 'lightgrey'}}>
              <VariantTableTitleColumn><strong>{COHORTS[cohort]}</strong></VariantTableTitleColumn>
              {Object.keys(POPULATIONS).map((pop) => {
                const popCounts = processedVariant
                  .diseases[currentDisease]
                  .cohorts[cohort]
                  .populations[pop]
                if (Object.keys(popCounts).length !== 0) {
                  if (popCounts.pop_freq !== undefined) {
                    return (
                      <VariantTableCell key={cohort + '-' + pop}>
                        {`${popCounts.pop_ac} (${popCounts.pop_freq.toPrecision(3)})`}
                      </VariantTableCell>
                    )
                  }
                }
                return (
                  <VariantTableCell key={cohort + '-' + pop}>
                    ...
                  </VariantTableCell>
                )
              })}
            </TableRow>
          ))}
          {['RBH', 'EGY', 'SGP', 'GNO'].map(cohort => (//TODO
            <TableRow key={cohort}>
              <VariantTableTitleColumn><strong>{COHORTS[cohort]}</strong></VariantTableTitleColumn>
              {Object.keys(POPULATIONS).map((pop) => {
                const popCounts = processedVariant
                  .diseases['HVO']
                  .cohorts[cohort]
                  .populations[pop]
                if (Object.keys(popCounts).length !== 0) {
                  if (popCounts.pop_freq !== undefined) {
                    return (
                      <VariantTableCell key={cohort + '-' + pop}>
                        {`${popCounts.pop_ac} (${popCounts.pop_freq.toPrecision(3)})`}
                      </VariantTableCell>
                    )
                  }
                }
                return (
                  <VariantTableCell key={cohort + '-' + pop}>
                    …
                  </VariantTableCell>
                )
              })}
            </TableRow>
          ))}
        </TableRows>
      </Table>
    </VariantContainer>
  )
}
Variant.propTypes = {
  variant: PropTypes.object,
  currentDisease: PropTypes.string.isRequired,
}

const singleVariantData = createSelector(
  [hoveredVariant, allVariantsInCurrentDataset],
  (hoveredVariant, variants) => variants.get(hoveredVariant)
)

export default connect(
  state => ({
    variant: singleVariantData(state),
    currentDisease: currentDisease(state),
  })
)(Variant)
