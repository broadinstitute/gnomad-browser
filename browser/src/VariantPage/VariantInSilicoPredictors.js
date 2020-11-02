import PropTypes from 'prop-types'
import React from 'react'

import { List, ListItem } from '@gnomad/ui'

const PREDICTOR_LABELS = {
  cadd: 'CADD',
  revel: 'REVEL',
  primate_ai: 'PrimateAI',
  splice_ai: 'SpliceAI',
}

const VariantInSilicoPredictors = ({ variant }) => {
  return (
    <div>
      <p>
        Transcript-specific predictors SIFT and Polyphen are listed with Variant Effect Predictor
        annotations.
      </p>
      <List>
        {variant.in_silico_predictors.map(({ id, value }) => (
          <ListItem key={id}>
            {PREDICTOR_LABELS[id]}: {value}
          </ListItem>
        ))}
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
