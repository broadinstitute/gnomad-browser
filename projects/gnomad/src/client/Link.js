import PropTypes from 'prop-types'
import queryString from 'query-string'
import React from 'react'
import { Link as RRLink, withRouter } from 'react-router-dom'

import { Link as StyledLink } from '@broad/ui'

const StyledRRLink = StyledLink.withComponent(RRLink)

const Link = withRouter(props => {
  const { location, history, match, preserveSelectedDataset, staticContext, to, ...rest } = props
  let finalTo = to

  if (preserveSelectedDataset) {
    const currentParams = queryString.parse(location.search)
    if (typeof to === 'string') {
      finalTo = { pathname: to, search: queryString.stringify({ dataset: currentParams.dataset }) }
    } else {
      const toParams = queryString.parse(to.search)
      finalTo = {
        ...to,
        search: queryString.stringify({ ...toParams, dataset: currentParams.dataset }),
      }
    }
  }

  return <StyledRRLink {...rest} to={finalTo} />
})

Link.propTypes = {
  preserveSelectedDataset: PropTypes.bool,
}

Link.defaultProps = {
  preserveSelectedDataset: true,
}

export default Link
