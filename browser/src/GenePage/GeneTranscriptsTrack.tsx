import { max, mean } from 'd3-array'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import TranscriptsTrack from '@gnomad/track-transcripts'
import { Button, Modal, TooltipAnchor } from '@gnomad/ui'

import { ALL_GTEX_TISSUES, GtexTissueName } from '../gtex'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import sortedTranscripts from './sortedTranscripts'
import TranscriptsTissueExpression from './TranscriptsTissueExpression'
import { Gene } from './GenePage'
import { DatasetId, hasStructuralVariants } from '../../../dataset-metadata/metadata'
import { GtexTissueDetail, TranscriptWithTissueExpression } from './TissueExpressionTrack'

const TranscriptsInfoWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
`

const TranscriptLabel = styled.span`
  font-size: 11px;
`

const RightPanel = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0.375em;
`

type GeneTranscriptsTrack = {
  datasetId: DatasetId
  isTissueExpressionAvailable: boolean
  gene: Gene
  includeNonCodingTranscripts: boolean
  includeUTRs: boolean
  preferredTranscriptId?: string
  preferredTranscriptDescription?: string | React.ReactNode
}

const GeneTranscriptsTrack = ({
  datasetId,
  isTissueExpressionAvailable,
  gene,
  includeNonCodingTranscripts,
  includeUTRs,
  preferredTranscriptId,
  preferredTranscriptDescription,
}: GeneTranscriptsTrack) => {
  const transcriptsTrack = useRef(null)
  const [showTissueExpressionModal, setShowTissueExpressionModal] = useState(false)

  const gtexTissues: Partial<Record<GtexTissueName, GtexTissueDetail>> = {}
  if (isTissueExpressionAvailable) {
    const preferredTranscript = (gene.transcripts as TranscriptWithTissueExpression[]).find(
      (transcript) => transcript.transcript_id === preferredTranscriptId
    )
    preferredTranscript!.gtex_tissue_expression.forEach((tissue) => {
      gtexTissues[tissue.tissue as GtexTissueName] = {
        fullName: ALL_GTEX_TISSUES[tissue.tissue as GtexTissueName].fullName || tissue.tissue,
        color: ALL_GTEX_TISSUES[tissue.tissue as GtexTissueName].color || '#888888',
        value: tissue.value,
      }
    })
  }

  const maxMeanExpression = isTissueExpressionAvailable
    ? max(
        (gene.transcripts as TranscriptWithTissueExpression[]).map(
          (transcript) => mean(transcript.gtex_tissue_expression.map((tissue) => tissue.value))!
        )
      )
    : undefined

  return (
    <>
      <Track
        renderRightPanel={({ width }: any) => {
          return (
            width > 30 && (
              <RightPanel>
                <InfoButton topic="transcript-tissue-expression" />
              </RightPanel>
            )
          )
        }}
      >
        {() => (
          <TranscriptsInfoWrapper>
            <span>{preferredTranscriptDescription && <>* {preferredTranscriptDescription}</>}</span>
            <span>
              {isTissueExpressionAvailable && (
                <Button
                  style={{ marginRight: '1ch' }}
                  onClick={() => {
                    setShowTissueExpressionModal(true)
                  }}
                >
                  Show transcript tissue expression
                </Button>
              )}
              <Button
                onClick={() => {
                  // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
                  transcriptsTrack.current.downloadPlot(`${gene.gene_id}_transcripts`)
                }}
              >
                Save transcripts plot
              </Button>
            </span>
          </TranscriptsInfoWrapper>
        )}
      </Track>
      <TranscriptsTrack
        ref={transcriptsTrack}
        renderTranscriptLeftPanel={
          hasStructuralVariants(datasetId)
            ? ({ transcript }: any) => (
                <TranscriptLabel>
                  {transcript.transcript_id}.{transcript.transcript_version}
                  {transcript.transcript_id === preferredTranscriptId && '*'}
                </TranscriptLabel>
              )
            : ({ transcript }: any) => (
                <TranscriptLabel>
                  <Link to={`/transcript/${transcript.transcript_id}`}>
                    {transcript.transcript_id}.{transcript.transcript_version}
                    {transcript.transcript_id === preferredTranscriptId && '*'}
                  </Link>
                </TranscriptLabel>
              )
        }
        renderTranscriptRightPanel={
          !isTissueExpressionAvailable
            ? null
            : ({
                transcript,
                width,
              }: {
                transcript: TranscriptWithTissueExpression
                width: number
              }) => {
                if (width < 36) {
                  return null
                }

                const meanExpression = mean(
                  transcript.gtex_tissue_expression.map(
                    (tissueExpression) => tissueExpression.value
                  )
                )!
                const maxExpression = max(
                  transcript.gtex_tissue_expression.map(
                    (tissueExpression) => tissueExpression.value
                  )
                )!
                const tissueMostExpressedIn = transcript.gtex_tissue_expression.find(
                  (tissue) => tissue.value === maxExpression
                )!.tissue

                const circleRadiusMeanContribution = meanExpression === 0 ? 0 : 0.25
                const circleRadiusMaxMeanContribution =
                  maxMeanExpression === 0 ? 0 : meanExpression / maxMeanExpression!
                const circleRadius = Math.sqrt(
                  circleRadiusMeanContribution + 23.75 * circleRadiusMaxMeanContribution
                )

                return (
                  <svg width={width} height={10}>
                    <TooltipAnchor
                      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message
                      tooltip={`Mean expression across all tissues = ${meanExpression.toFixed(
                        2
                      )} TPM\nMost expressed in ${
                        gtexTissues[tissueMostExpressedIn as GtexTissueName]!.fullName
                      } (${maxExpression.toFixed(2)} TPM)`}
                    >
                      <rect
                        x={0}
                        y={0}
                        width={30}
                        height={10}
                        fill="none"
                        pointerEvents="visible"
                      />
                    </TooltipAnchor>
                    <circle cx={15} cy={5} r={circleRadius} fill="#333" pointerEvents="none" />
                  </svg>
                )
              }
        }
        showNonCodingTranscripts={includeNonCodingTranscripts}
        showUTRs={includeUTRs}
        transcripts={sortedTranscripts(gene.transcripts, preferredTranscriptId)}
      />
      {showTissueExpressionModal && (
        <Modal
          // @ts-expect-error TS(2820) FIXME: Type '"xlarge"' is not assignable to type '"small"... Remove this comment to see the full error message
          size="xlarge"
          title="Transcript tissue expression"
          onRequestClose={() => {
            setShowTissueExpressionModal(false)
          }}
        >
          <TranscriptsTissueExpression
            gtexTissues={gtexTissues}
            transcripts={gene.transcripts as TranscriptWithTissueExpression[]}
            includeNonCodingTranscripts={includeNonCodingTranscripts}
            preferredTranscriptId={preferredTranscriptId}
            preferredTranscriptDescription={preferredTranscriptDescription}
          />
        </Modal>
      )}
    </>
  )
}

GeneTranscriptsTrack.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
}

export default GeneTranscriptsTrack
