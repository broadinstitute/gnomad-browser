import PropTypes from 'prop-types'
import React from 'react'
import { withRouter } from 'react-router-dom'

import { ExternalLink, Link as StyledLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

class ErrorBoundary extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    location: PropTypes.shape({
      pathname: PropTypes.string,
      search: PropTypes.string,
    }).isRequired,
  }

  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    const { children, location } = this.props
    const { error } = this.state

    if (error) {
      const issueBody = `

Stack trace:
\`\`\`
${error.stack}
\`\`\`

Route: ${location.pathname}${location.search}

Browser: ${navigator.userAgent}

`

      const issueURL = `https://github.com/broadinstitute/gnomad-browser/issues/new?title=${encodeURIComponent(
        error.message
      )}&body=${encodeURIComponent(issueBody)}&labels=Type%3A%20Bug`

      const emailURL = `mailto:gnomad@broadinstitute.org?subject=${encodeURIComponent(
        'Browser bug report'
      )}&body=${encodeURIComponent(issueBody.replace(/```\n/g, ''))}`

      return (
        <InfoPage>
          <DocumentTitle title="Error" />
          <PageHeading>Something Went Wrong</PageHeading>
          <p>An error prevented this page from being displayed.</p>
          <p>
            This is a bug. Please{' '}
            <ExternalLink href={issueURL}>file an issue on GitHub</ExternalLink> or{' '}
            <ExternalLink href={emailURL}>email us</ExternalLink> and{' '}
            <StyledLink href="/">reload the browser</StyledLink>.
          </p>
        </InfoPage>
      )
    }

    return children
  }
}

export default withRouter(ErrorBoundary)
