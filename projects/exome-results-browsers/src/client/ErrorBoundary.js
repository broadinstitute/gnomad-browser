import PropTypes from 'prop-types'
import React from 'react'
import { withRouter } from 'react-router-dom'

import { ExternalLink, Link as StyledLink, Page, PageHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'

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
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    const { children, location } = this.props
    const { hasError } = this.state

    if (hasError) {
      const issueURL = `https://github.com/macarthur-lab/gnomadjs/issues/new?template=bug_report.md&title=${encodeURIComponent(
        `Render error on ${location.pathname}${location.search}`
      )}&labels=Project%3A%20Exome%20Results%2CType%3A%20Bug`

      return (
        <Page>
          <DocumentTitle title="Error" />
          <PageHeading>Something Went Wrong</PageHeading>
          <p>An error occurred while rendering this page.</p>
          <p>
            This is a bug. Please{' '}
            <ExternalLink href={issueURL}>file an issue on GitHub</ExternalLink> and{' '}
            <StyledLink href="/">reload the browser</StyledLink>.
          </p>
        </Page>
      )
    }

    return children
  }
}

export default withRouter(ErrorBoundary)
