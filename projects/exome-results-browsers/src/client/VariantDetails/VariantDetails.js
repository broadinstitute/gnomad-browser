import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink } from '@broad/ui'
import { getLabelForConsequenceTerm } from '@broad/utilities'

import AnalysisGroupsTable from './AnalysisGroupsTable'
import { VariantAttribute, VariantAttributeList } from './VariantAttributes'

const VariantContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 300px;
`

const Column = styled.div``

const Columns = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  margin: 1em 0;

  ${Column} {
    flex-basis: calc(33% - 1em);
  }

  @media (max-width: 1024px) {
    ${Column} {
      flex-basis: calc(50% - 1em);
    }
  }

  @media (max-width: 600px) {
    ${Column} {
      flex-basis: 100%;
    }
  }
`

const TranscriptAttributes = styled.dl`
  margin: 0 0 0.25em 0.5em;

  dt {
    display: inline;
  }

  dd {
    display: inline;
    margin-left: 0.25em;
  }
`

function formatPolyPhen(abbreviation) {
  if (!abbreviation) {
    return ''
  }
  switch (abbreviation) {
    case 'D':
      return 'Damaging'
    case 'P':
      return 'Possibly damaging'
    case 'B':
      return 'Benign'
    default:
      return abbreviation
  }
}

function formatAlleleFrequency(frequency) {
  return Number(frequency.toPrecision(4)).toExponential()
}

const formatInAnalysisFlag = inAnalysis => {
  if (inAnalysis === null) {
    return '—'
  }
  return inAnalysis ? 'Yes' : 'No'
}

const VariantDetails = ({ variant }) => {
  const transcriptHGVSc = {}
  if (variant.hgvsc) {
    variant.hgvsc.split(',').forEach(s => {
      const [tId, hgvsc] = s.split(':')
      transcriptHGVSc[tId.replace(/\.\d+$/, '')] = hgvsc
    })
  }

  const transcriptHGVSp = {}
  if (variant.hgvsp) {
    variant.hgvsp.split(',').forEach(s => {
      const [tId, hgvsp] = s.split(':')
      transcriptHGVSp[tId.replace(/\.\d+$/, '')] = hgvsp
    })
  }

  return (
    <VariantContainer>
      <ExternalLink href={`https://gnomad.broadinstitute.org/variant/${variant.variant_id}`}>
        View in gnomAD
      </ExternalLink>
      <Columns>
        <Column>
          <VariantAttributeList label="Statistics">
            <VariantAttribute label="Cases">
              {variant.ac_case} / {variant.an_case} ({formatAlleleFrequency(variant.af_case)})
            </VariantAttribute>
            <VariantAttribute label="Controls">
              {variant.ac_ctrl} / {variant.an_ctrl} ({formatAlleleFrequency(variant.af_ctrl)})
            </VariantAttribute>
            <VariantAttribute label="N denovos">{variant.ac_denovo}</VariantAttribute>
          </VariantAttributeList>

          {variant.pval_meta !== null && (
            <VariantAttributeList label="Analysis">
              <VariantAttribute label="Meta P-Value">
                {Number(variant.pval_meta.toPrecision(3)).toExponential()}
              </VariantAttribute>
              <VariantAttribute label="Estimate">
                {Number(variant.estimate.toPrecision(3)).toExponential()}
              </VariantAttribute>
              <VariantAttribute label="SE">{variant.se}</VariantAttribute>
              <VariantAttribute label="Qp">{variant.qp}</VariantAttribute>
              <VariantAttribute label="I2">{variant.i2}</VariantAttribute>
            </VariantAttributeList>
          )}
        </Column>

        <Column>
          <VariantAttributeList label="Annotations">
            <VariantAttribute label="HGVSc">{variant.hgvsc_canonical}</VariantAttribute>
            <VariantAttribute label="HGVSp">{variant.hgvsp_canonical}</VariantAttribute>
            <VariantAttribute label="Consequence">
              {getLabelForConsequenceTerm(variant.consequence)}
            </VariantAttribute>
            <VariantAttribute label="MPC">{variant.mpc}</VariantAttribute>
            <VariantAttribute label="CADD">{variant.cadd}</VariantAttribute>
            <VariantAttribute label="PolyPhen">{formatPolyPhen(variant.polyphen)}</VariantAttribute>
            <VariantAttribute label="Flags">{variant.flags}</VariantAttribute>
            <VariantAttribute label="Source">
              {variant.source ? variant.source.join(', ') : '—'}
            </VariantAttribute>
            <VariantAttribute label="In analysis">
              {formatInAnalysisFlag(variant.in_analysis)}
            </VariantAttribute>
            <VariantAttribute label="Comment">{variant.comment}</VariantAttribute>
          </VariantAttributeList>
        </Column>

        {variant.transcript_id && (
          <Column>
            <VariantAttributeList label="Transcripts">
              {variant.transcript_id.split(',').map(tID => (
                <VariantAttribute key={tID} label={tID}>
                  <TranscriptAttributes>
                    <div>
                      <dt>HGVSc:</dt>
                      <dd>{transcriptHGVSc[tID] || '—'}</dd>
                    </div>
                    <div>
                      <dt>HGVSp:</dt>
                      <dd>{transcriptHGVSp[tID] || '—'}</dd>
                    </div>
                  </TranscriptAttributes>
                </VariantAttribute>
              ))}
            </VariantAttributeList>
          </Column>
        )}
      </Columns>

      <h2>Analysis Groups</h2>
      <AnalysisGroupsTable variantId={variant.variant_id} />
    </VariantContainer>
  )
}

VariantDetails.propTypes = {
  variant: PropTypes.object.isRequired,
}

export default VariantDetails
