import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import { GTEX_TISSUE_NAMES } from '../gtex'

import sortedTranscripts from './sortedTranscripts'
import TranscriptsTissueExpressionPlot from './TranscriptsTissueExpressionPlot'

const ScrollWrapper = styled.div`
  display: inline-block;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
`

const isTranscriptCoding = transcript => transcript.exons.some(exon => exon.feature_type === 'CDS')

const TranscriptsTissueExpression = ({
  transcripts,
  includeNonCodingTranscripts,
  preferredTranscriptId,
  preferredTranscriptDescription,
}) => {
  const [sortTranscriptsBy, setSortTranscriptsBy] = useState('default')

  let renderedTranscripts =
    sortTranscriptsBy === 'default'
      ? sortedTranscripts(transcripts, preferredTranscriptId)
      : [...transcripts].sort((t1, t2) => {
          const t1Expression = t1.gtex_tissue_expression[sortTranscriptsBy] || 0
          const t2Expression = t2.gtex_tissue_expression[sortTranscriptsBy] || 0

          if (t1Expression === t2Expression) {
            return t1.transcript_id.localeCompare(t2.transcript_id)
          }

          return t2Expression - t1Expression
        })

  if (!includeNonCodingTranscripts) {
    renderedTranscripts = renderedTranscripts.filter(isTranscriptCoding)
  }

  return (
    <div>
      <div>
        <label htmlFor="transcript-tissue-expression-sort-transcripts-by">
          Sort transcripts by:{' '}
          <Select
            id="transcript-tissue-expression-sort-transcripts-by"
            value={sortTranscriptsBy}
            onChange={e => setSortTranscriptsBy(e.target.value)}
          >
            <option value="default">Default</option>
            <optgroup label="Expression in tissue">
              {Object.entries(GTEX_TISSUE_NAMES).map(([tissueId, tissueName]) => {
                return (
                  <option key={tissueId} value={tissueId}>
                    {tissueName}
                  </option>
                )
              })}
            </optgroup>
          </Select>
        </label>
      </div>
      {preferredTranscriptDescription && <p>* {preferredTranscriptDescription}</p>}
      <ScrollWrapper>
        <TranscriptsTissueExpressionPlot
          transcripts={renderedTranscripts}
          starredTranscriptId={preferredTranscriptId}
        />
      </ScrollWrapper>
    </div>
  )
}

TranscriptsTissueExpression.propTypes = {
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      transcript_version: PropTypes.string.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  includeNonCodingTranscripts: PropTypes.bool.isRequired,
  preferredTranscriptId: PropTypes.string,
  preferredTranscriptDescription: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
}

TranscriptsTissueExpression.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
}

export default TranscriptsTissueExpression
