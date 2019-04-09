import PropTypes from 'prop-types'
import React from 'react'

import { Link as StyledLink, List, ListItem } from '@broad/ui'

const VariantFeedback = ({ datasetId, variantId }) => {
  const reportEmailBody = `
Name:
Institution:

Variant ID: ${variantId} (https://gnomad.broadinstitute.org/variant/${variantId}?dataset=${datasetId})

Variant issue: (clinically implausible, read support poor, other artifact, etc.)
Please explain your concern about this variant
`

  const reportURL = `mailto:exomeconsortium@gmail.com?subject=${encodeURIComponent(
    'Variant report'
  )}&body=${encodeURIComponent(reportEmailBody)}`

  const requestEmailBody = `
Name:
Institution:

Variant ID: ${variantId} (https://gnomad.broadinstitute.org/variant/${variantId}?dataset=${datasetId})

Expected phenotype:

Additional information that may be helpful for our understanding of the request:
`

  const requestURL = `mailto:exomeconsortium@gmail.com?subject=${encodeURIComponent(
    'Request for variant information'
  )}&body=${encodeURIComponent(requestEmailBody)}`

  return (
    <List>
      <ListItem>
        <StyledLink href={reportURL}>Report this variant</StyledLink>
      </ListItem>
      <ListItem>
        <StyledLink href={requestURL}>Request additional information</StyledLink>
      </ListItem>
    </List>
  )
}

VariantFeedback.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantFeedback
