import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'

import { ExternalLink, Modal } from '@gnomad/ui'

import Delayed from '../Delayed'

const HelpTopicModal = ({ topicId, ...otherProps }) => {
  const [title, setTitle] = useState('Help')
  const [content, setContent] = useState(
    <div style={{ height: '200px' }}>
      <Delayed>Loading</Delayed>
    </div>
  )

  useEffect(() => {
    import('./helpTopics').then(
      mod => {
        const helpTopics = mod.default
        const topic = helpTopics[topicId.toLowerCase()]

        if (topic) {
          setTitle(topic.title)
          setContent(topic.render())
        } else {
          setTitle('Not found')
          setContent('Topic not found')
        }
      },
      () => {
        setContent('Unable to load help')
      }
    )
  }, [topicId])

  return (
    <Modal {...otherProps} size="large" title={title}>
      <p style={{ marginTop: 0, fontSize: '16px' }}>
        <ExternalLink href={`/help/${topicId}`}>View this information in a new tab.</ExternalLink>
      </p>

      {content}
    </Modal>
  )
}

HelpTopicModal.propTypes = {
  topicId: PropTypes.string.isRequired,
}

export default HelpTopicModal
