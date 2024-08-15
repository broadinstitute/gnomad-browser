import { mean } from 'd3-array'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Select } from '@gnomad/ui'

import { GtexTissues } from '../gtex'

import sortedTranscripts from './sortedTranscripts'
import TranscriptsTissueExpressionPlot from './TranscriptsTissueExpressionPlot'
import { TranscriptWithTissueExpression } from './TissueExpressionTrack'

const ScrollWrapper = styled.div`
  display: inline-block;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
`

const isTranscriptCoding = (transcript: any) =>
  transcript.exons.some((exon: any) => exon.feature_type === 'CDS')

type TranscriptsTissueExpressionProps = {
  gtexTissues: Partial<GtexTissues>
  transcripts: TranscriptWithTissueExpression[]
  includeNonCodingTranscripts: boolean
  preferredTranscriptId?: string
  preferredTranscriptDescription?: string | React.ReactNode
  defaultSortTissuesBy?: 'alphabetical' | 'mean-expression'
}

export type TissueExpression = {
  tissue: string
  value: number
}

export type GtexTissueExpression = TissueExpression[]

const TranscriptsTissueExpression = ({
  gtexTissues,
  transcripts,
  includeNonCodingTranscripts,
  preferredTranscriptId,
  preferredTranscriptDescription,
  defaultSortTissuesBy,
}: TranscriptsTissueExpressionProps) => {
  const [sortTranscriptsBy, setSortTranscriptsBy] = useState('default')

  let renderedTranscripts =
    sortTranscriptsBy === 'default'
      ? sortedTranscripts(transcripts, preferredTranscriptId)
      : [...transcripts].sort((t1, t2) => {
          const t1Expression =
            t1.gtex_tissue_expression.find(
              (tissue: TissueExpression) => tissue.tissue === sortTranscriptsBy
            )!.value || 0
          const t2Expression =
            t2.gtex_tissue_expression.find(
              (tissue: TissueExpression) => tissue.tissue === sortTranscriptsBy
            )!.value || 0

          if (t1Expression === t2Expression) {
            return t1.transcript_id.localeCompare(t2.transcript_id)
          }

          return t2Expression - t1Expression
        })

  const [sortTissuesBy, setSortTissuesBy] = useState(defaultSortTissuesBy)
  let tissues
  if (sortTissuesBy === 'mean-expression') {
    const meanExpressionByTissue: Record<string, number> = Object.keys(gtexTissues).reduce(
      (acc, tissueId) => ({
        ...acc,
        [tissueId]: mean(
          transcripts.map(
            (transcript: any) =>
              transcript.gtex_tissue_expression.find(
                (tissue: TissueExpression) => tissue.tissue === tissueId
              ).value || 0
          )
        ),
      }),
      {}
    )
    tissues = Object.entries(gtexTissues)
      .sort((t1, t2) => {
        const t1Expression = meanExpressionByTissue[t1[0]]
        const t2Expression = meanExpressionByTissue[t2[0]]
        if (t1Expression === t2Expression) {
          return t1[1].fullName.localeCompare(t2[1].fullName)
        }
        return t2Expression - t1Expression
      })
      .map((t: any) => t[0])
  } else {
    tissues = Object.entries(gtexTissues)
      .sort((t1, t2) => t1[1].fullName.localeCompare(t2[1].fullName))
      .map((t) => t[0])
  }

  if (!includeNonCodingTranscripts) {
    renderedTranscripts = renderedTranscripts.filter(isTranscriptCoding)
  }

  return (
    <div>
      <div style={{ marginBottom: '1em' }}>
        <label htmlFor="transcript-tissue-expression-sort-transcripts-by">
          Sort transcripts by:{' '}
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="transcript-tissue-expression-sort-transcripts-by"
            value={sortTranscriptsBy}
            onChange={(e: any) => setSortTranscriptsBy(e.target.value)}
          >
            <option value="default">Default</option>
            <optgroup label="Expression in tissue">
              {Object.entries(gtexTissues).map(([tissueId, tissueDetails]) => {
                return (
                  <option key={tissueId} value={tissueId}>
                    {tissueDetails.fullName}
                  </option>
                )
              })}
            </optgroup>
          </Select>
        </label>
      </div>
      <div style={{ marginBottom: '1em' }}>
        <label htmlFor="transcript-tissue-expression-sort-tissues-by">
          Sort tissues by: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="transcript-tissue-expression-sort-tissues-by"
            value={sortTissuesBy}
            onChange={(e: any) => setSortTissuesBy(e.target.value)}
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="mean-expression">Mean transcript expression in tissue</option>
          </Select>
        </label>
      </div>
      {preferredTranscriptDescription && <p>* {preferredTranscriptDescription}</p>}
      <ScrollWrapper>
        <TranscriptsTissueExpressionPlot
          gtexTissues={gtexTissues}
          tissues={tissues}
          transcripts={renderedTranscripts as TranscriptWithTissueExpression[]}
          starredTranscriptId={preferredTranscriptId}
        />
      </ScrollWrapper>
    </div>
  )
}

TranscriptsTissueExpression.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
  defaultSortTissuesBy: 'alphabetical',
}

export default TranscriptsTissueExpression
