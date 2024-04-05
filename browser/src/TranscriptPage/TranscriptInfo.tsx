import React from 'react'

import { ExternalLink } from '@gnomad/ui'
import { GeneMetadata } from '../GenePage/GenePage'

import AttributeList, { AttributeListItem } from '../AttributeList'
import Link from '../Link'
import InfoButton from '../help/InfoButton'

type TranscriptReferencesProps = {
  transcript: {
    transcript_id: string
    transcript_version: string
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
  }
}

const TranscriptReferences = ({ transcript }: TranscriptReferencesProps) => {
  const {
    transcript_id: transcriptId,
    reference_genome: referenceGenome,
    chrom,
    start,
    stop,
  } = transcript

  const ensemblGeneUrl = `https://${
    referenceGenome === 'GRCh37' ? 'grch37.' : ''
  }ensembl.org/Homo_sapiens/Transcript/Summary?t=${transcriptId}`

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'
  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${start}-${stop}`

  return (
    <React.Fragment>
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>,{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
    </React.Fragment>
  )
}

type TranscriptInfoProps = {
  transcript: {
    transcript_id: string
    transcript_version: string
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
    gene: GeneMetadata
  }
}

const TranscriptInfo = ({ transcript }: TranscriptInfoProps) => {
  const ucscReferenceGenomeId = transcript.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'

  const isManeSelectTranscript =
    transcript.transcript_id === (transcript.gene.mane_select_transcript || {}).ensembl_id
  const isCanonicalTranscript = transcript.transcript_id === transcript.gene.canonical_transcript_id

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeListItem label="Genome build">
        {transcript.reference_genome} / {ucscReferenceGenomeId}
      </AttributeListItem>
      <AttributeListItem label="Ensembl ID">
        {transcript.transcript_id}.{transcript.transcript_version}
      </AttributeListItem>
      <AttributeListItem label="Gene">
        <Link to={`/gene/${transcript.gene.gene_id}`}>
          {transcript.gene.symbol} ({transcript.gene.gene_id}.{transcript.gene.gene_version})
        </Link>
        {isManeSelectTranscript && (
          <>
            <br />
            This transcript is{' '}
            {transcript.transcript_version !==
              // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
              transcript.gene.mane_select_transcript.ensembl_version && 'a version of '}
            the MANE Select transcript for {transcript.gene.symbol}{' '}
            <InfoButton topic="mane-select-transcript" />
          </>
        )}
        {isCanonicalTranscript && (
          <>
            <br />
            This transcript is {isManeSelectTranscript && 'also '}the Ensembl canonical transcript
            for {transcript.gene.symbol} <InfoButton topic="canonical-transcript" />
          </>
        )}
      </AttributeListItem>
      <AttributeListItem label="Region">
        <Link to={`/region/${transcript.chrom}-${transcript.start}-${transcript.stop}`}>
          {transcript.chrom}:{transcript.start}-{transcript.stop}
        </Link>
      </AttributeListItem>
      <AttributeListItem label="External resources">
        <TranscriptReferences transcript={transcript} />
      </AttributeListItem>
    </AttributeList>
  )
}

export default TranscriptInfo
