import PropTypes from 'prop-types'
import { useEffect } from 'react'

import browserConfig from '@browser/config'

const DocumentTitle = ({ title }) => {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | ${browserConfig.browserTitle}`
      : browserConfig.browserTitle
    document.title = fullTitle
  }, [title])
  return null
}

DocumentTitle.propTypes = {
  title: PropTypes.string,
}

DocumentTitle.defaultProps = {
  title: null,
}

export default DocumentTitle
