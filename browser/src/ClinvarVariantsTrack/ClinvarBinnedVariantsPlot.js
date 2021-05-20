import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { List, ListItem } from '@gnomad/ui'

import BinnedVariantsPlot from '../BinnedVariantsPlot'

import {
  CLINICAL_SIGNIFICANCE_CATEGORIES,
  CLINICAL_SIGNIFICANCE_CATEGORY_LABELS,
  CLINICAL_SIGNIFICANCE_CATEGORY_COLORS,
  clinvarVariantClinicalSignificanceCategory,
} from './clinvarVariantCategories'

const TooltipContent = styled.div`
  line-height: 1;
  text-align: left;

  ${List} {
    /* margin-top: 0; */
  }

  ${ListItem} {
    &:last-child {
      margin: 0;
    }
  }

  p {
    margin-bottom: 0.5em;
  }
`

const ClinvarBinnedVariantsPlot = ({ includedCategories, ...props }) => {
  return (
    <BinnedVariantsPlot
      {...props}
      categoryColor={category => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[category]}
      formatTooltip={bin => {
        return (
          <TooltipContent>
            This bin contains:
            <List>
              {CLINICAL_SIGNIFICANCE_CATEGORIES.filter(
                category => includedCategories[category]
              ).map(category => {
                return (
                  <ListItem key={category}>
                    {bin[category]} {CLINICAL_SIGNIFICANCE_CATEGORY_LABELS[category].toLowerCase()}{' '}
                    variant{bin[category] !== 1 ? 's' : ''}
                  </ListItem>
                )
              })}
            </List>
            Click &quot;Expand to all variants&quot; to see individual variants.
          </TooltipContent>
        )
      }}
      variantCategory={clinvarVariantClinicalSignificanceCategory}
      variantCategories={CLINICAL_SIGNIFICANCE_CATEGORIES}
    />
  )
}

ClinvarBinnedVariantsPlot.propTypes = {
  includedCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
}

export default ClinvarBinnedVariantsPlot
