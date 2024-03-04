import React from 'react'
import styled from 'styled-components'

import { Badge, ExternalLink, List, ListItem } from '@gnomad/ui'
import { DatasetId, isV4 } from '@gnomad/dataset-metadata/metadata'
import { Variant } from './VariantPage'

const PREDICTORS = {
  cadd: { label: 'CADD', warningThreshold: 10, dangerThreshold: 20 },
  revel: { label: 'REVEL', warningThreshold: 0.5, dangerThreshold: 0.75 },
  primate_ai: { label: 'PrimateAI', warningThreshold: 0.5, dangerThreshold: 0.7 },
  splice_ai: { label: 'SpliceAI', warningThreshold: 0.5, dangerThreshold: 0.8 },
}

const FLAG_DESCRIPTIONS = {
  cadd: { has_duplicate: 'This variant has multiple CADD scores' },
  revel: { has_duplicate: 'This variant has multiple REVEL scores' },
  primate_ai: { has_duplicate: 'This variant has multiple PrimateAI scores' },
  splice_ai: { has_duplicate: 'This variant has multiple SpliceAI scores' },
}

const PREDICTORS_V4 = {
  revel_max: {
    label: 'REVEL',
    warningThreshold: 0.644,
    dangerThreshold: 0.773,
    absoluteValue: false,
  },
  spliceai_ds_max: {
    label: 'SpliceAI',
    warningThreshold: 0.2,
    dangerThreshold: 0.5,
    absoluteValue: false,
  },
  pangolin_largest_ds: {
    label: 'Pangolin',
    warningThreshold: 0.2,
    dangerThreshold: 0.5,
    absoluteValue: true,
  },
  phylop: {
    label: 'phyloP',
    warningThreshold: 7.367,
    dangerThreshold: 9.741,
    absoluteValue: false,
  },
  sift_max: {
    label: 'SIFT (max)',
    warningThreshold: 0.001,
    dangerThreshold: 0,
    absoluteValue: false,
  },
  polyphen_max: {
    label: 'PolyPhen (max)',
    warningThreshold: 0.978,
    dangerThreshold: 0.999,
    absoluteValue: false,
  },
  cadd: { label: 'CADD', warningThreshold: 25.3, dangerThreshold: 28.1, absoluteValue: false },
}

const EXCLUDED_v4_PREDICTORS = ['sift_max']

const FLAG_DESCRIPTIONS_V4 = {
  polyphen_max:
    'We prioritized max scores for MANE Select or canonical transcripts if a prediction score was available for multiple transcripts.',
  sift_max:
    'We prioritized max scores for MANE Select or canonical transcripts if a prediction score was available for multiple transcripts.',
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
  variant: Variant
  datasetId: DatasetId
}

const VariantInSilicoPredictors = ({ variant, datasetId }: Props) => {
  const predictors = isV4(datasetId) ? PREDICTORS_V4 : PREDICTORS
  const flag_descriptions = isV4(datasetId) ? FLAG_DESCRIPTIONS_V4 : FLAG_DESCRIPTIONS

  return (
    <div>
      {!isV4(datasetId) && (
        <p>
          Transcript-specific predictors SIFT and Polyphen are listed with Variant Effect Predictor
          annotations.
        </p>
      )}
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <List>
        {variant.in_silico_predictors &&
          variant.in_silico_predictors
            .filter(({ id }) => {
              if (isV4(datasetId) && EXCLUDED_v4_PREDICTORS.includes(id)) {
                return false
              }
              return true
            })
            .map(({ id, value, flags }) => {
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              const predictor = predictors[id]

              let color = null
              const parsedValue = predictor.absoluteValue
                ? Math.abs(parseFloat(value))
                : parseFloat(value)
              if (!Number.isNaN(parsedValue)) {
                if (!predictor.dangerThreshold || !predictor.warningThreshold) {
                  color = 'grey'
                } else if (
                  predictor &&
                  predictor.dangerThreshold &&
                  parsedValue >= predictor.dangerThreshold
                ) {
                  color = '#FF583F'
                } else if (
                  predictor &&
                  predictor.warningThreshold &&
                  parsedValue >= predictor.warningThreshold
                ) {
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
                        {flags.map((flag) => flag_descriptions[id][flag] || flag).join(', ')}
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
                      {flags.map((flag) => flag_descriptions[id][flag] || flag).join(', ')}
                    </p>
                  )}
                </ListItem>
              )
            })}
      </List>
      {isV4(datasetId) && (
        <>
          <Badge level="info">Note</Badge> For more detailed and up to date SpliceAI and Pangolin
          predictions, please visit our {/* @ts-expect-error */}
          <ExternalLink
            href={`https://spliceailookup.broadinstitute.org/#variant=chr${variant.variant_id}&hg=38&distance=500&mask=0&ra=0}`}
          >
            SpliceAI Lookup browser
          </ExternalLink>
        </>
      )}
    </div>
  )
}

export default VariantInSilicoPredictors
