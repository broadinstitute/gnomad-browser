import React from 'react'
import styled from 'styled-components'

import { Badge, List, ListItem } from '@gnomad/ui'
import { DatasetId, isV4 } from '@gnomad/dataset-metadata/metadata'

const PREDICTORS = {
  cadd: { label: 'CADD', warningThreshold: 10, dangerThreshold: 20 },
  revel: { label: 'REVEL', warningThreshold: 0.5, dangerThreshold: 0.75 },
  primate_ai: { label: 'PrimateAI', warningThreshold: 0.5, dangerThreshold: 0.7 },
  splice_ai: { label: 'SpliceAI', warningThreshold: 0.5, dangerThreshold: 0.8 },
  pangolin: { label: "Pangolin" },
  sift: { label: "SIFT" },
  polyphen: { label: "PolyPhen" },
  phylop: { label: "phyloP" },
}

const FLAG_DESCRIPTIONS = {
  cadd: { has_duplicate: 'This variant has multiple CADD scores' },
  revel: { has_duplicate: 'This variant has multiple REVEL scores' },
  primate_ai: { has_duplicate: 'This variant has multiple PrimateAI scores' },
  splice_ai: { has_duplicate: 'This variant has multiple SpliceAI scores' },
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
    background: ${(props: any) => props.color};
  }
`

type Props = {
  variant: {
    in_silico_predictors: {
      id: string
      value: string
      flags: string[]
    }[]
  }
  datasetId: DatasetId
}

const VariantInSilicoPredictors = ({ variant, datasetId }: Props) => {
  return (
    <div>
      {!isV4(datasetId) && <p>
        Transcript-specific predictors SIFT and Polyphen are listed with Variant Effect Predictor
        annotations.
      </p>}
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <List>
        {variant.in_silico_predictors && variant.in_silico_predictors.map(({ id, value, flags }) => {
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          const predictor = PREDICTORS[id]

          let color = null
          const parsedValue = parseFloat(value)
          if (!Number.isNaN(parsedValue)) {
            if (!predictor.dangerThreshold || !predictor.warningThreshold) {
              color = 'grey'
            } else if (predictor && predictor.dangerThreshold && parsedValue >= predictor.dangerThreshold) {
              color = '#FF583F'
            } else if (predictor && predictor.warningThreshold && parsedValue >= predictor.warningThreshold) {
              color = '#F0C94D'
            } else {
              color = 'green'
            }
          }

          if (predictor) {
            return (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              <ListItem key={id}>
                {color && <Marker color={color} />}
                {predictor.label}: {value}
                {flags && flags.length > 0 && (
                  <p style={{ marginTop: '0.5em' }}>
                    <Badge level="info">Note</Badge>{' '}
                    {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
                    {flags.map((flag) => FLAG_DESCRIPTIONS[id][flag] || flag).join(', ')}
                  </p>
                )}
              </ListItem>
            )
          }
          return (
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            <ListItem key={id}>
              {id}: {value}
              {flags && flags.length > 0 && (
                <p style={{ marginTop: '0.5em' }}>
                  <Badge level="info">Note</Badge>{' '}
                  {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
                  {flags.map((flag) => FLAG_DESCRIPTIONS[id][flag] || flag).join(', ')}
                </p>
              )}
            </ListItem>
          )
        })}
      </List>
    </div>
  )
}

export default VariantInSilicoPredictors
