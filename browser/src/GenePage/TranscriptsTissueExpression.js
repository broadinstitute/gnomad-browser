import { max } from 'd3-array'
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
  defaultSortTissuesBy,
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

  const [sortTissuesBy, setSortTissuesBy] = useState(defaultSortTissuesBy)
  let tissues
  if (sortTissuesBy === 'max-expression') {
    const maxExpressionByTissue = Object.keys(GTEX_TISSUE_NAMES).reduce(
      (acc, tissueId) => ({
        ...acc,
        [tissueId]: max(
          transcripts.map(transcript => transcript.gtex_tissue_expression[tissueId] || 0)
        ),
      }),
      {}
    )
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1, t2) => {
        const t1MaxExpression = maxExpressionByTissue[t1[0]]
        const t2MaxExpression = maxExpressionByTissue[t2[0]]
        if (t1MaxExpression === t2MaxExpression) {
          return t1[1].localeCompare(t2[1])
        }
        return t2MaxExpression - t1MaxExpression
      })
      .map(t => t[0])
  } else {
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1, t2) => t1[1].localeCompare(t2[1]))
      .map(t => t[0])
  }

  if (!includeNonCodingTranscripts) {
    renderedTranscripts = renderedTranscripts.filter(isTranscriptCoding)
  }

  return (
    <div>
      <div style={{ marginBottom: '1em' }}>
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
      <div style={{ marginBottom: '1em' }}>
        <label htmlFor="transcript-tissue-expression-sort-tissues-by">
          Sort tissues by:{' '}
          <Select
            id="transcript-tissue-expression-sort-tissues-by"
            value={sortTissuesBy}
            onChange={e => setSortTissuesBy(e.target.value)}
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="max-expression">Max transcript expression in tissue</option>
          </Select>
        </label>
      </div>
      {preferredTranscriptDescription && <p>* {preferredTranscriptDescription}</p>}
      <ScrollWrapper>
        <TranscriptsTissueExpressionPlot
          tissues={tissues}
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
  defaultSortTissuesBy: PropTypes.oneOf(['alphabetical', 'max-expression']),
}

TranscriptsTissueExpression.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
  defaultSortTissuesBy: 'alphabetical',
}

export default TranscriptsTissueExpression
