import PropTypes from 'prop-types'
import React from 'react'

import Link from '../Link'

const LoFCurationResult = ({ result }) => {
  const { verdict, flags = [] } = result
  return (
    <>
      <Link to={`/gene/${result.gene_id}`}>{result.gene_symbol || result.gene_id}</Link>
      <div>Curated as {verdict}</div>
      {flags.length > 0 && <div>Contributing factors: {flags.join(', ')}</div>}
    </>
  )
}

LoFCurationResult.propTypes = {
  result: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    gene_symbol: PropTypes.string,
    verdict: PropTypes.string.isRequired,
    flags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
}

export default LoFCurationResult
