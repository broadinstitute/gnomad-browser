import React, { useState } from 'react'

import { ExternalLink, Link as StyledLink } from '@gnomad/ui'

import { buildBugReportBody, buildBugReportUrls, BugReportContext } from './buildBugReportBody'

type Props = {
  error: Error
  context: BugReportContext
}

const BugReportControls = ({ error, context }: Props) => {
  const [bugDescription, setBugDescription] = useState('')

  const body = buildBugReportBody(error, bugDescription, context)
  const { issueURL, forumURL, emailURL } = buildBugReportUrls(error, body)

  return (
    <>
      <p>
        Please describe what you were trying to do at the time the page crashed
        <div>
          <textarea
            id="bug-description"
            name="bug-description"
            value={bugDescription}
            onChange={(e) => setBugDescription(e.target.value)}
            rows={4}
            cols={50}
          />
        </div>
      </p>

      <p>
        And submit this bug report as{' '}
        <ul>
          <li>
            <ExternalLink href={issueURL}>an issue on GitHub</ExternalLink> or{' '}
          </li>
          <li>
            <ExternalLink href={forumURL}>a topic on our forum</ExternalLink>
          </li>
        </ul>
        Then
        <StyledLink href="/">reload the browser</StyledLink>.
        <br />
        <br />
        <br />
        <p>
          Alternately, you can <ExternalLink href={emailURL}>email us</ExternalLink>. Please note
          that we prioritize answering issues on Github and topics on the Forum, so if you choose to
          email it may take us longer to respond.
        </p>
      </p>
    </>
  )
}

export default BugReportControls
