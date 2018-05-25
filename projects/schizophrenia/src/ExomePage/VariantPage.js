import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'
import { singleVariantData, focusedVariant } from '@broad/redux-variants'
import { fromJS } from 'immutable'
import {
  Table,
  VerticalTextLabels,
  TableVerticalLabel,
  VerticalLabelText,
  TableRows,
  TableRow,
  TableHeader,
  TableCell,
  TableTitleColumn,
} from '@broad/ui'

const VariantContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 80%;
  min-height: 300px;
  ${'' /* margin-left: 50px; */}
  margin-top: 30px;
  margin-right: 50px;
  margin-bottom: 100px;
`

const SideBySide = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: space-between;

  ${'' /* s: space-between; */}
`

const VariantTitle = styled.h1`

`

const VariantDetails = styled.div`
  width: 50%;
`

const VariantAttributes = styled.div`
  display: flex;
  font-size: 16px;
  flex-direction: column;
  align-items: space-between;
  margin-top: 10px;
  margin-bottom: 10px;
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

const schizophreniaVariantDetailQuery = gql`
  query VariantDetailTable(
    $variantQuery: String,
  ) {
    groups: schzGroups(variant_id: $variantQuery) {
      pos
      xpos
      pval
      ac_case
      contig
      beta
      variant_id
      an_ctrl
      an_case
      group
      ac_ctrl
      allele_freq
    }
  }
`

const withQuery = graphql(schizophreniaVariantDetailQuery, {
  options: ({ variant }) => {
    let variantQuery
    if (!variant) {
      variantQuery = ''
    } else {
      variantQuery = variant.variant_id
    }
    return ({
      variables: { variantQuery },
      errorPolicy: 'ignore'
    })
  },
})

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

const Variant = ({ variant, data: { loading, groups } }) => {
  if (!variant || loading) {
    return <VariantContainer />
  }

  const transcriptHGVSc = {}
  if (variant.hgvsc) {
    variant.hgvsc.split(',').forEach(s => {
      const [tID, hgvsc] = s.split(':')
      transcriptHGVSc[tID] = hgvsc
    })
  }

  const transcriptHGVSp = {}
  if (variant.hgvsp) {
    variant.hgvsp.split(',').forEach(s => {
      const [tID, hgvsp] = s.split(':')
      transcriptHGVSp[tID] = hgvsp
    })
  }

  console.log(groups)
  return (
    <VariantContainer>
      <VariantTitle>{variant.variant_id}</VariantTitle>
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

        <div>
          <h2>Groups</h2>
          <Table>
            <TableRows>
              <TableHeader>
                <TableCell width={'200px'}>Group</TableCell>
                <TableCell width={'80px'}>Cases</TableCell>
                <TableCell width={'80px'}>Controls</TableCell>
                <TableCell width={'80px'}>P-value</TableCell>
                <TableCell width={'80px'}>Beta</TableCell>
              </TableHeader>
              {fromJS(groups).map(group => (
                <TableRow key={group.get('group')}>
                  <TableCell width={'200px'}>{group.get('group')}</TableCell>
                  <TableCell width={'80px'}>{group.get('ac_case')}</TableCell>
                  <TableCell width={'80px'}>{group.get('ac_ctrl')}</TableCell>
                  <TableCell width={'80px'}>{group.get('pval')}</TableCell>
                  <TableCell width={'80px'}>{group.get('beta')}</TableCell>
                </TableRow>
              ))}
            </TableRows>
          </Table>
        </div>
      </SideBySide>
    </VariantContainer>
  )
}
Variant.propTypes = {
  variant: PropTypes.object.isRequired,
}

export default compose(
  connect(state => ({ variant: singleVariantData(state) })),
  withQuery
)(Variant)
