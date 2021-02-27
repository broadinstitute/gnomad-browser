import PropTypes from 'prop-types'
import React from 'react'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'
import MarkdownContent from '../MarkdownContent'

import helpTopics from './helpTopics' // eslint-disable-line import/no-unresolved,import/extensions

const HelpTopicPage = ({ topicId }) => {
  const topic = helpTopics[topicId.toLowerCase()]

  return (
    <InfoPage>
      <DocumentTitle title={(topic || {}).title || 'Not found'} />
      {topic ? (
        <MarkdownContent dangerouslySetInnerHTML={{ __html: topic.html }} />
      ) : (
        <p>Topic not found</p>
      )}
    </InfoPage>
  )
}

HelpTopicPage.propTypes = {
  topicId: PropTypes.string.isRequired,
}

export default HelpTopicPage
