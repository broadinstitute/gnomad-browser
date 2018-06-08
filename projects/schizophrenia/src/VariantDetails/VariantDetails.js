import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { singleVariantData } from '@broad/redux-variants'

import AnalysisGroupsTable from './AnalysisGroupsTable'


const VariantContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 30px 50px 100px 0;
  min-height: 300px;
  width: 80%;
`

const SideBySide = styled.div`
  align-items: space-between;
  display: flex;
  flex-direction: row;
  width: 100%;
`

const VariantDetails = styled.div`
  width: 50%;
`

const VariantAttributes = styled.div`
  align-items: space-between;
  display: flex;
  flex-direction: column;
  font-size: 16px;
  margin: 10px 0;
`

const VariantAttribute = styled.div`
  margin-bottom: 2px;
`

const TranscriptAttributes = styled.dl`
  margin-top: 0;
  dt, dd {
    display: inline;
  }
`

const Link = styled.a`
  color: rgba(70, 130, 180, 1);
  cursor: pointer;
  text-decoration: none;
`


function formatConsequence(abbreviation) {
  if (!abbreviation) {
    return ''
  }
  switch (abbreviation) {
    case 'mis':
      return 'Missense'
    case 'ns':
      return 'Inframe indel'
    case 'syn':
      return 'Synonymous'
    case 'splice':
      return 'Splice region'
    case 'lof':
      return 'Loss of function'
    default:
      return abbreviation
  }
}

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

const Variant = ({ variant }) => {
  if (!variant) {
    return null
  }

  const transcriptHGVSc = {}
  if (variant.hgvsc) {
    variant.hgvsc.split(',').forEach((s) => {
      const [tID, hgvsc] = s.split(':')
      transcriptHGVSc[tID] = hgvsc
    })
  }

  const transcriptHGVSp = {}
  if (variant.hgvsp) {
    variant.hgvsp.split(',').forEach((s) => {
      const [tID, hgvsp] = s.split(':')
      transcriptHGVSp[tID] = hgvsp
    })
  }

  return (
    <VariantContainer>
      <h1>{variant.variant_id}</h1>
      <SideBySide>
        <VariantDetails>
          <Link href={`http://gnomad.broadinstitute.org/variant/${variant.variant_id}`}>View in gnomAD</Link>

          <VariantAttributes>
            <h2>Statistics</h2>
            <VariantAttribute>
              <strong>Cases:</strong> {variant.ac_case} / {variant.an_case} ({Number(variant.af_case.toPrecision(4)).toExponential()})
            </VariantAttribute>
            <VariantAttribute>
              <strong>Controls:</strong> {variant.ac_ctrl} / {variant.an_ctrl}  ({Number(variant.af_ctrl.toPrecision(4)).toExponential()})
            </VariantAttribute>
            <VariantAttribute>
              <strong>N analysis groups:</strong> {variant.n_analysis_groups}
            </VariantAttribute>
            <VariantAttribute>
              <strong>N denovos:</strong> {variant.ac_denovo}
            </VariantAttribute>
          </VariantAttributes>

          <VariantAttributes>
            <h2>Annotations</h2>
            <VariantAttribute>
              <strong>HGVSc:</strong> {variant.hgvsc_canonical}
            </VariantAttribute>
            <VariantAttribute>
              <strong>HGVSp:</strong> {variant.hgvsp_canonical}
            </VariantAttribute>
            <VariantAttribute>
              <strong>Consequence:</strong> {formatConsequence(variant.consequence)}
            </VariantAttribute>
            <VariantAttribute>
              <strong>MPC:</strong> {variant.mpc}
            </VariantAttribute>
            <VariantAttribute>
              <strong>CADD:</strong> {variant.cadd}
            </VariantAttribute>
            <VariantAttribute>
              <strong>PolyPhen:</strong> {formatPolyPhen(variant.polyphen)}
            </VariantAttribute>
            <VariantAttribute>
              <strong>Flags:</strong> {variant.flags}
            </VariantAttribute>
            <VariantAttribute>
              <strong>Source:</strong> {variant.source}
            </VariantAttribute>
            <VariantAttribute>
              <strong>In analysis:</strong> {variant.in_analysis}
            </VariantAttribute>
            <VariantAttribute>
              <strong>Comment:</strong> {variant.comment}
            </VariantAttribute>
          </VariantAttributes>

          {variant.pval_meta !== null && (
            <VariantAttributes>
              <h2>Analysis</h2>
              <VariantAttribute>
                <strong>Meta P-Value:</strong> {Number(variant.pval_meta.toPrecision(3)).toExponential()}
              </VariantAttribute>
              <VariantAttribute>
                <strong>Estimate:</strong> {Number(variant.estimate.toPrecision(3)).toExponential()}
              </VariantAttribute>
              <VariantAttribute>
                <strong>SE:</strong> {variant.se}
              </VariantAttribute>
              <VariantAttribute>
                <strong>Qp:</strong> {variant.qp}
              </VariantAttribute>
              <VariantAttribute>
                <strong>I2:</strong> {variant.i2}
              </VariantAttribute>
            </VariantAttributes>
          )}

          {variant.transcript_id && (
            <VariantAttributes>
              <h2>Transcripts</h2>
              {variant.transcript_id.split(',').map(tID => (
                <VariantAttribute key={tID}>
                  <strong>{tID}</strong>
                  <TranscriptAttributes>
                    <div>
                      <dt>HGVSc</dt><dd>{transcriptHGVSc[tID]}</dd>
                    </div>
                    <div>
                      <dt>HGVSp</dt><dd>{transcriptHGVSp[tID]}</dd>
                    </div>
                  </TranscriptAttributes>
                </VariantAttribute>
              ))}
            </VariantAttributes>
          )}
        </VariantDetails>

        <AnalysisGroupsTable variantId={variant.variant_id} />

      </SideBySide>
    </VariantContainer>
  )
}

Variant.propTypes = {
  variant: PropTypes.object,
}

Variant.defaultProps = {
  variant: null,
}

export default connect(state => ({ variant: singleVariantData(state) }))(Variant)
