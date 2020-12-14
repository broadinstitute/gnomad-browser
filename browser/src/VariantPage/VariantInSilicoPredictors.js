import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { List, ListItem } from '@gnomad/ui'

const PREDICTORS = {
  cadd: { label: 'CADD', warningThreshold: 10, dangerThreshold: 20 },
  revel: { label: 'REVEL', warningThreshold: 0.5, dangerThreshold: 0.75 },
  primate_ai: { label: 'PrimateAI', warningThreshold: 0.5, dangerThreshold: 0.7 },
  splice_ai: { label: 'SpliceAI', warningThreshold: 0.5, dangerThreshold: 0.8 },
}

const Marker = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 1px solid #000;
    border-radius: 5px;
    background: ${props => props.color};
  }
`

const VariantInSilicoPredictors = ({ variant }) => {
  return (
    <div>
      <p>
        Transcript-specific predictors SIFT and Polyphen are listed with Variant Effect Predictor
        annotations.
      </p>
      <List>
        {variant.in_silico_predictors.map(({ id, value }) => {
          const predictor = PREDICTORS[id]

          let color = null
          const parsedValue = parseFloat(value)
          if (!Number.isNaN(parsedValue)) {
            if (parsedValue >= predictor.dangerThreshold) {
              color = '#FF583F'
            } else if (parsedValue >= predictor.warningThreshold) {
              color = '#F0C94D'
            } else {
              color = 'green'
            }
          }

          if (predictor) {
            return (
              <ListItem key={id}>
                {color && <Marker color={color} />}
                {predictor.label}: {value}
              </ListItem>
            )
          }
          return (
            <ListItem key={id}>
              {id}: {value}
            </ListItem>
          )
        })}
      </List>
    </div>
  )
}

VariantInSilicoPredictors.propTypes = {
  variant: PropTypes.shape({
    in_silico_predictors: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

export default VariantInSilicoPredictors
