import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { getCategoryFromConsequence } from '@broad/utilities'

const AttributeName = styled.dt`
  display: inline;

  ::after {
    content: ': ';
  }
`

const AttributeValue = styled.dd`
  display: inline;
  margin: 0;
`

const AttributeList = styled.dl`
  display: flex;
  flex-direction: column;
  margin: 0;
`

const Attribute = ({ children, name }) => (
  <div>
    <AttributeName>{name}</AttributeName>
    <AttributeValue>{children}</AttributeValue>
  </div>
)

Attribute.propTypes = {
  children: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
}

const colors = {
  red: '#FF583F',
  yellow: '#F0C94D',
  green: 'green',
}

const TranscriptConsequenceDetails = ({ consequence }) => {
  if (consequence.major_consequence === 'missense_variant') {
    const polyphenColor =
      {
        benign: colors.green,
        possibly_damaging: colors.yellow,
      }[consequence.polyphen_prediction] || colors.red

    const siftColor = consequence.sift_prediction === 'tolerated' ? colors.green : colors.red

    return (
      <AttributeList>
        <Attribute name="HGVSp">{consequence.hgvs}</Attribute>
        {consequence.polyphen_prediction && (
          <Attribute name="Polyphen">
            <span style={{ color: polyphenColor }}>{consequence.polyphen_prediction}</span>
          </Attribute>
        )}
        {consequence.sift_prediction && (
          <Attribute name="SIFT">
            <span style={{ color: siftColor }}>{consequence.sift_prediction}</span>
          </Attribute>
        )}
      </AttributeList>
    )
  }

  if (
    // gnomAD 2.1's loading pipeline added NC annotations.
    // See #364.
    consequence.lof === 'NC' ||
    (getCategoryFromConsequence(consequence.major_consequence) === 'lof' && !consequence.lof)
  ) {
    return (
      <AttributeList>
        <Attribute name="HGVSp">{consequence.hgvs}</Attribute>
        <Attribute name="LoF">
          <span style={{ color: colors.red }}>Low-confidence (Non-protein-coding transcript)</span>
        </Attribute>
      </AttributeList>
    )
  }

  if (consequence.lof) {
    return (
      <AttributeList>
        <Attribute name="HGVSp">{consequence.hgvs}</Attribute>
        <Attribute name="LoF">
          <span style={{ color: consequence.lof === 'HC' ? colors.green : colors.red }}>
            {consequence.lof === 'HC'
              ? 'High-confidence'
              : `Low-confidence (${consequence.lof_filter})`}
          </span>
        </Attribute>
        {consequence.lof_flags && (
          <Attribute name="Flag">
            <span style={{ color: colors.yellow }}>{consequence.lof_flags}</span>
          </Attribute>
        )}
      </AttributeList>
    )
  }

  return null
}

TranscriptConsequenceDetails.propTypes = {
  consequence: PropTypes.shape({
    biotype: PropTypes.string,
    consequence_terms: PropTypes.arrayOf(PropTypes.string),
    gene_id: PropTypes.string.isRequired,
    gene_symbol: PropTypes.string.isRequired,
    hgvs: PropTypes.string,
    hgvsc: PropTypes.string,
    hgvsp: PropTypes.string,
    lof: PropTypes.string,
    lof_flags: PropTypes.string,
    lof_filter: PropTypes.string,
    major_consequence: PropTypes.string,
    polyphen_prediction: PropTypes.string,
    sift_prediction: PropTypes.string,
    transcript_id: PropTypes.string.isRequired,
  }).isRequired,
}

export default TranscriptConsequenceDetails
