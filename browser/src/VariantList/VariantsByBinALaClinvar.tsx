import React, { useState, useMemo } from 'react'
import styled from 'styled-components'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'

import { List, ListItem } from '@gnomad/ui'

import VariantFilterControls from './VariantFilterControls'
import mergeExomeAndGenomeData from './mergeExomeAndGenomeData'
import filterVariants from './filterVariants'
import BinnedVariantsPlot from '../BinnedVariantsPlot'

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

const consequenceCategories = ['lof', 'missense', 'synonymous', 'other']

const consequenceCategoryColors = {
  lof: '#FF583F',
  missense: '#F0C94D',
  synonymous: '#008000',
  other: '#757575',
}

const consequenceCategoryGroups = {
  lof: new Set([
    'splice_donor_variant',
    'splice_acceptor_variant',
    'frameshift_variant',
    'stop_gained',
  ]),
  missense: new Set([
    'start_lost',
    'stop_lost',
    'missense_variant',
    'inframe_insertion',
    'inframe_deletion',
  ]),
  synonymous: new Set(['synonymous_variant']),
  other: new Set(['5_prime_UTR_variant', 'splice_region_variant', 'intron_variant', 'other']),
}

const determineCategoryColor = (variant: any) => {
  if (consequenceCategoryGroups.lof.has(variant.consequence)) {
    return 'lof'
  }

  if (consequenceCategoryGroups.missense.has(variant.consequence)) {
    return 'missense'
  }

  if (consequenceCategoryGroups.synonymous.has(variant.consequence)) {
    return 'synonymous'
  }

  return 'other'
}

const VariantsByBinALaClinvar = ({ variants }: any) => {
  // blabla
  return (
    <Track renderLeftPanel={() => <span>gnomAD Variants By Bin</span>}>
      {({ scalePosition, width }: any) => {
        return (
          <BinnedVariantsPlot
            // @ts-expect-error
            categoryColor={(category: any) => consequenceCategoryColors[category]}
            variantCategories={consequenceCategories}
            variantCategory={determineCategoryColor}
            variants={variants}
            scalePosition={scalePosition}
            width={width}
            formatTooltip={(bin: any) => {
              return (
                <TooltipContent>
                  This bin contains:
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <List>
                    {consequenceCategories.map((category) => {
                      return (
                        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                        <ListItem key={category}>
                          {bin[category]} {category} variant
                          {bin[category] !== 1 ? 's' : ''}
                        </ListItem>
                      )
                    })}
                  </List>
                </TooltipContent>
              )
            }}
          />
        )
      }}
    </Track>
  )
}

export default VariantsByBinALaClinvar
