import PropTypes from 'prop-types'
import React from 'react'

import { Link as StyledLink, List, ListItem } from '@broad/ui'

const reportURL = variantId => {
  const reportTemplate = `
Name:
Institution:

Variant ID: ${variantId}

Variant issue: (clinically implausible, read support poor, other artifact, etc.)
Please explain your concern about this variant
`

  return `mailto:exomeconsortium@gmail.com?subject=${encodeURIComponent(
    'Variant report'
  )}&body=${encodeURIComponent(reportTemplate)}`
}

const requestURL = variantId => {
  const requestTemplate = `
Name:
Institution:

Variant ID: ${variantId}

Expected phenotype:

Additional information that may be helpful for our understanding of the request:
`

  return `mailto:exomeconsortium@gmail.com?subject=${encodeURIComponent(
    'Request for variant information'
  )}&body=${encodeURIComponent(requestTemplate)}`
}

const VariantFeedback = ({ datasetId, variantId }) => (
  <List>
    <ListItem>
      <StyledLink href={reportURL(variantId)}>Report this variant</StyledLink>
    </ListItem>
    <ListItem>
      <StyledLink href={requestURL(variantId)}>Request additional information</StyledLink>
    </ListItem>
  </List>
)

VariantFeedback.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantFeedback
