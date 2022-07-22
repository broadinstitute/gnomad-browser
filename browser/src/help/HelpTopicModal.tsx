import React, { useEffect, useState } from 'react'

import { ExternalLink, Modal } from '@gnomad/ui'

import Delayed from '../Delayed'

type Props = {
  topicId: string
}

const HelpTopicModal = ({ topicId, ...otherProps }: Props) => {
  const [title, setTitle] = useState('Help')
  const [content, setContent] = useState(
    <div style={{ height: '200px' }}>
      <Delayed>Loading</Delayed>
    </div>
  )

  useEffect(() => {
    import('./helpTopics').then(
      (mod) => {
        const helpTopics = mod.default
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const topic = helpTopics[topicId.toLowerCase()]

        if (topic) {
          setTitle(topic.title)
          setContent(topic.render())
        } else {
          setTitle('Not found')
          // @ts-expect-error TS(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
          setContent('Topic not found')
        }
      },
      () => {
        // @ts-expect-error TS(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        setContent('Unable to load help')
      }
    )
  }, [topicId])

  return (
    // @ts-expect-error TS(2741) FIXME: Property 'onRequestClose' is missing in type '{ ch... Remove this comment to see the full error message
    <Modal {...otherProps} size="large" title={title}>
      <p style={{ marginTop: 0, fontSize: '16px' }}>
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href={`/help/${topicId}`}>View this information in a new tab.</ExternalLink>
      </p>

      {content}
    </Modal>
  )
}

export default HelpTopicModal
