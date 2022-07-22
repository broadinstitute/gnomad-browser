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

type Props = {
  includedCategories: {
    [key: string]: boolean
  }
}

const ClinvarBinnedVariantsPlot = ({ includedCategories, ...props }: Props) => {
  return (
    <BinnedVariantsPlot
      {...props}
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      categoryColor={(category: any) => CLINICAL_SIGNIFICANCE_CATEGORY_COLORS[category]}
      formatTooltip={(bin: any) => {
        return (
          <TooltipContent>
            This bin contains:
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <List>
              {CLINICAL_SIGNIFICANCE_CATEGORIES.filter(
                (category) => includedCategories[category]
              ).map((category) => {
                return (
                  // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                  <ListItem key={category}>
                    {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
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

export default ClinvarBinnedVariantsPlot
