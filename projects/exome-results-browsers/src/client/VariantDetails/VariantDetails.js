import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink } from '@broad/ui'
import { getLabelForConsequenceTerm } from '@broad/utilities'

import browserConfig from '@browser/config'

import Query from '../Query'
import { VariantAttribute, VariantAttributeList } from './VariantAttributes'
import VariantResultsTable from './VariantResultsTable'

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

const formatInAnalysisFlag = inAnalysis => {
  if (inAnalysis === null) {
    return null
  }
  return inAnalysis ? 'Yes' : 'No'
}

const renderNumber = (num, precision = 3) =>
  num === null ? null : Number(num.toPrecision(precision)).toString()

const renderExponential = (num, precision = 3) =>
  num === null ? null : Number(num.toPrecision(precision)).toExponential()

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

  const defaultGroupResult = variant.results.find(
    result => result.analysis_group === browserConfig.analysisGroups.defaultGroup
  )

  return (
    <VariantContainer>
      <ExternalLink href={`https://gnomad.broadinstitute.org/variant/${variant.variant_id}`}>
        View in gnomAD
      </ExternalLink>
      <Columns>
        {defaultGroupResult && (
          <Column>
            <VariantAttributeList label="Statistics">
              <VariantAttribute label="Cases">
                {defaultGroupResult.ac_case} / {defaultGroupResult.an_case} (
                {renderExponential(defaultGroupResult.af_case, 4)})
              </VariantAttribute>
              <VariantAttribute label="Controls">
                {defaultGroupResult.ac_ctrl} / {defaultGroupResult.an_ctrl} (
                {renderExponential(defaultGroupResult.af_ctrl, 4)})
              </VariantAttribute>
            </VariantAttributeList>

            <VariantAttributeList label="Analysis">
              <VariantAttribute label="In analysis">
                {formatInAnalysisFlag(defaultGroupResult.in_analysis)}
              </VariantAttribute>
              <VariantAttribute label="P-Value">
                {renderNumber(defaultGroupResult.p)}
              </VariantAttribute>
              <VariantAttribute label="Estimate">
                {renderNumber(defaultGroupResult.est)}
              </VariantAttribute>
              <VariantAttribute label="SE">{renderNumber(defaultGroupResult.se)}</VariantAttribute>
              <VariantAttribute label="Qp">{renderNumber(defaultGroupResult.qp)}</VariantAttribute>
              <VariantAttribute label="I2">{renderNumber(defaultGroupResult.i2)}</VariantAttribute>
              <VariantAttribute label="N denovos">{defaultGroupResult.n_denovos}</VariantAttribute>
              <VariantAttribute label="Comment">{defaultGroupResult.comment}</VariantAttribute>
              <VariantAttribute label="Source">
                {defaultGroupResult.source ? defaultGroupResult.source.join(', ') : null}
              </VariantAttribute>
            </VariantAttributeList>
          </Column>
        )}

        <Column>
          <VariantAttributeList label="Annotations">
            <VariantAttribute label="HGVSc">{variant.hgvsc_canonical}</VariantAttribute>
            <VariantAttribute label="HGVSp">{variant.hgvsp_canonical}</VariantAttribute>
            <VariantAttribute label="Consequence">
              {getLabelForConsequenceTerm(variant.consequence)}
            </VariantAttribute>
            <VariantAttribute label="PolyPhen">{variant.polyphen}</VariantAttribute>
            <VariantAttribute label="MPC">{variant.mpc}</VariantAttribute>
            <VariantAttribute label="CADD">{variant.cadd}</VariantAttribute>
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
      <VariantResultsTable results={variant.results} />
    </VariantContainer>
  )
}

VariantDetails.propTypes = {
  variant: PropTypes.shape({
    variant_id: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    pos: PropTypes.number.isRequired,

    cadd: PropTypes.number,
    canonical_transcript_id: PropTypes.string,
    consequence: PropTypes.string,
    gene_id: PropTypes.string,
    gene_name: PropTypes.string,
    hgvsc: PropTypes.string,
    hgvsc_canonical: PropTypes.string,
    hgvsp: PropTypes.string,
    hgvsp_canonical: PropTypes.string,
    mpc: PropTypes.number,
    polyphen: PropTypes.string,
    transcript_id: PropTypes.string,

    results: PropTypes.arrayOf(
      PropTypes.shape({
        analysis_group: PropTypes.string.isRequired,
        ac_case: PropTypes.number.isRequired,
        an_case: PropTypes.number.isRequired,
        af_case: PropTypes.number.isRequired,
        ac_ctrl: PropTypes.number.isRequired,
        an_ctrl: PropTypes.number.isRequired,
        af_ctrl: PropTypes.number.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

const variantDetailsQuery = `
  query VariantDetails($variantId: String!) {
    variant(variant_id: $variantId) {
      variant_id
      chrom
      pos

      cadd
      canonical_transcript_id
      consequence
      gene_id
      gene_name
      hgvsc
      hgvsc_canonical
      hgvsp
      hgvsp_canonical
      mpc
      polyphen
      transcript_id

      results {
        analysis_group
        ac_case
        an_case
        af_case
        ac_ctrl
        an_ctrl
        af_ctrl

        comment
        est
        i2
        in_analysis
        n_denovos
        p
        qp
        se
        source
      }
    }
  }
`

const ConnectedVariantDetails = ({ variantId }) => (
  <Query query={variantDetailsQuery} variables={{ variantId }}>
    {({ data, error, loading }) => {
      if (loading) {
        return <span>Loading variant...</span>
      }

      if (error) {
        return <span>Unable to load variant</span>
      }

      return <VariantDetails variant={data.variant} />
    }}
  </Query>
)

ConnectedVariantDetails.propTypes = {
  variantId: PropTypes.string.isRequired,
}

export default ConnectedVariantDetails
