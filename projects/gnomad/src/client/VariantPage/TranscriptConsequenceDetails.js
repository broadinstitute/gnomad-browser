import PropTypes from 'prop-types'
import React from 'react'

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
      <span>
        {consequence.hgvs}
        <br />
        Polyphen: <span style={{ color: polyphenColor }}>{consequence.polyphen_prediction}</span>;
        SIFT: <span style={{ color: siftColor }}>{consequence.sift_prediction}</span>
      </span>
    )
  }

  if (consequence.lof) {
    const lofColor = consequence.lof === 'HC' ? colors.green : colors.red
    return (
      <span>
        {consequence.hgvs}
        <br />
        LoF:{' '}
        <span style={{ color: lofColor }}>
          {consequence.lof === 'HC'
            ? 'High-confidence'
            : `Low-confidence (${consequence.lof_filter})`}
        </span>
        {consequence.lof_flags && (
          <span style={{ color: colors.yellow }}>Flag: {consequence.lof_flags}</span>
        )}
      </span>
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
    transcript_id: PropTypes.string.isRequired,
  }).isRequired,
}

export default TranscriptConsequenceDetails
