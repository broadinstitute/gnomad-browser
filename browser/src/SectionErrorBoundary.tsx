import React, { ReactNode } from 'react'
import { withRouter, RouteComponentProps } from 'react-router-dom'

import { Modal, TextButton } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import BugReportControls from './BugReportControls'
import StatusMessage from './StatusMessage'

type SectionErrorBoundaryProps = {
  children: ReactNode
  sectionName: string
  datasetId: DatasetId
  entityDescription: string
  resetKeys: unknown[]
}

type Props = SectionErrorBoundaryProps & RouteComponentProps

type State = {
  error: Error | null
  isReportModalOpen: boolean
}

class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, isReportModalOpen: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    const { error } = this.state
    const { resetKeys } = this.props

    if (
      error &&
      (resetKeys.length !== prevProps.resetKeys.length ||
        resetKeys.some((key, index) => key !== prevProps.resetKeys[index]))
    ) {
      this.setState({ error: null })
    }
  }

  render() {
    const { children, sectionName, datasetId, entityDescription, location } = this.props
    const { error, isReportModalOpen } = this.state

    if (error) {
      return (
        <StatusMessage>
          <div>Something went wrong rendering {sectionName}.</div>
          <div style={{ marginTop: '0.5em' }}>
            <TextButton onClick={() => this.setState({ isReportModalOpen: true })}>
              Report this issue
            </TextButton>
            .
          </div>
          {isReportModalOpen && (
            <Modal
              onRequestClose={() => this.setState({ isReportModalOpen: false })}
              title={`Report a problem: ${sectionName}`}
              size="large"
            >
              <BugReportControls
                error={error}
                context={{
                  route: location,
                  section: { sectionName, datasetId, entityDescription },
                }}
              />
            </Modal>
          )}
        </StatusMessage>
      )
    }

    return children
  }
}

export default withRouter<Props, typeof SectionErrorBoundary>(SectionErrorBoundary)
