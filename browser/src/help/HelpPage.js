import PropTypes from 'prop-types'
import React from 'react'

import DocumentTitle from '../DocumentTitle'
import InfoPage from '../InfoPage'

import HelpContent from './HelpContent'
import helpTopics from './helpTopics' // eslint-disable-line import/no-unresolved,import/extensions

const HelpPage = ({ topicId }) => {
  const topic = helpTopics[topicId.toLowerCase()]

  return (
    <InfoPage>
      <DocumentTitle title={(topic || {}).title || 'Not found'} />
      {topic ? (
        <HelpContent dangerouslySetInnerHTML={{ __html: topic.html }} />
      ) : (
        <p>Topic not found</p>
      )}
    </InfoPage>
  )
}

HelpPage.propTypes = {
  topicId: PropTypes.string.isRequired,
}

export default HelpPage
