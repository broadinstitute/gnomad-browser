import React from 'react'
import { withRouter } from 'react-router-dom'

import { ExternalLink, Link as StyledLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

type Props = {
  location: {
    pathname?: string
    search?: string
  }
}

type State = any

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, bugDescription: '' }
  }

  static getDerivedStateFromError(error: any) {
    return { error }
  }

  render() {
    // @ts-expect-error TS(2339) FIXME: Property 'children' does not exist on type 'Readon... Remove this comment to see the full error message
    const { children, location } = this.props
    const { error, bugDescription } = this.state

    if (error) {
      const issueBody = `
**Description**: ${bugDescription}

**Error message**: ${error.message}

**Stack trace**:
\`\`\`
${error.stack}
\`\`\`

**Route**: ${location.pathname}${location.search}

**Browser**: ${navigator.userAgent}
`

      const issueURL = `https://github.com/broadinstitute/gnomad-browser/issues/new?title=${encodeURIComponent(
        error.message
      )}&body=${encodeURIComponent(issueBody)}&labels=Type%3A%20Bug`

      const forumURL = `https://discuss.gnomad.broadinstitute.org/new-topic?title=topic%20${encodeURIComponent(
        error.message
      )}&body=${encodeURIComponent(issueBody)}&category=Browser&tags=bug`

      const emailURL = `mailto:gnomad@broadinstitute.org?subject=${encodeURIComponent(
        'Browser bug report'
      )}&body=${encodeURIComponent(issueBody.replace(/```\n/g, ''))}`

      return (
        <InfoPage>
          <DocumentTitle title="Error" />
          <PageHeading>Something Went Wrong</PageHeading>
          <p>An error prevented this page from being displayed.</p>
          <p>This is a bug.</p>
          <p>
            Please describe what you were trying to do at the time the page crashed
            <div>
              <textarea
                id="bug-description"
                name="bug-description"
                value={bugDescription}
                onChange={(e) => this.setState({ bugDescription: e.target.value })}
                rows={4}
                cols={50}
              />
            </div>
          </p>

          <p>
            And submit this bug report as{' '}
            <ul>
              <li>
                {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                <ExternalLink href={issueURL}>an issue on GitHub</ExternalLink> or{' '}
              </li>
              <li>
                {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                <ExternalLink href={forumURL}>a topic on our forum</ExternalLink>
              </li>
            </ul>
            Then {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
            <StyledLink href="/">reload the browser</StyledLink>.
            <br />
            <br />
            <br />
            <p>
              Alternately, you can{' '}
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink href={emailURL}>email us</ExternalLink>. Please note that we prioritize
              answering issues on Github and topics on the Forum, so if you choose to email it may
              take us longer to respond.
            </p>
          </p>
        </InfoPage>
      )
    }

    return children
  }
}

// @ts-expect-error TS(2345) FIXME: Argument of type 'typeof ErrorBoundary' is not ass... Remove this comment to see the full error message
export default withRouter(ErrorBoundary)
