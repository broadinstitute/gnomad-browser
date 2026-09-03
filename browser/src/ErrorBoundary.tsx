import React, { ReactNode } from 'react'
import { withRouter } from 'react-router-dom'

import { PageHeading } from '@gnomad/ui'

import BugReportControls from './BugReportControls'
import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

type Props = {
  children: ReactNode
  location: {
    pathname?: string
    search?: string
  }
}

type State = {
  error: Error | null
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { children, location } = this.props
    const { error } = this.state

    if (error) {
      return (
        <InfoPage>
          <DocumentTitle title="Error" />
          <PageHeading>Something Went Wrong</PageHeading>
          <p>An error prevented this page from being displayed.</p>
          <p>This is a bug.</p>
          <BugReportControls error={error} context={{ route: location }} />
        </InfoPage>
      )
    }

    return children
  }
}

// @ts-expect-error TS(2345) FIXME: Argument of type 'typeof ErrorBoundary' is not ass... Remove this comment to see the full error message
export default withRouter(ErrorBoundary)
