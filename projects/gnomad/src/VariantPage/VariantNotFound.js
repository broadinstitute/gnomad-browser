import PropTypes from 'prop-types'
import React from 'react'

import Link from '../Link'
import StatusMessage from '../StatusMessage'

const VariantNotFound = ({ variantId }) => {
  const parts = variantId.split('-')
  const chrom = parts[0]
  const pos = Number(parts[1])

  const redirectRegion = `${chrom}-${pos - 20}-${pos + 20}`

  return (
    <div>
      <StatusMessage>
        Variant not found
        <br />
        <br />
        <Link to={`/region/${redirectRegion}`}>View surrounding region</Link>
      </StatusMessage>
    </div>
  )
}

VariantNotFound.propTypes = {
  variantId: PropTypes.string.isRequired,
}

export default VariantNotFound
