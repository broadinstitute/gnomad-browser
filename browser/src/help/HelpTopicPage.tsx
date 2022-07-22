import React from 'react'

import { PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'
import Link from '../Link'

import helpTopics from './helpTopics'

type Props = {
  topicId: string
} // eslint-disable-line import/no-unresolved,import/extensions

const HelpTopicPage = ({ topicId }: Props) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  const topic = helpTopics[topicId.toLowerCase()]

  const title = topic ? topic.title : 'Not found'

  return (
    <InfoPage>
      <DocumentTitle title={title} />
      <PageHeading>{title}</PageHeading>

      {topic ? (
        topic.render()
      ) : (
        <>
          <p>Topic not found</p>
          <p>
            <Link to="/help">See all help topics</Link>
          </p>
        </>
      )}
    </InfoPage>
  )
}

export default HelpTopicPage
