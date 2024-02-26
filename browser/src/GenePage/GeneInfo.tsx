import React from 'react'

import AttributeList, { AttributeListItem } from '../AttributeList'
import InfoButton from '../help/InfoButton'
import InlineList from '../InlineList'
import Link from '../Link'

import GeneReferences from './GeneReferences'

type ManeSelectTranscriptIdProps = {
  gene: {
    mane_select_transcript: {
      ensembl_id: string
      ensembl_version: string
      refseq_id: string
      refseq_version: string
    }
    transcripts: {
      transcript_id: string
      transcript_version: string
    }[]
  }
}

const ManeSelectTranscriptId = ({ gene }: ManeSelectTranscriptIdProps) => {
  const gencodeVersionOfManeSelectTransript = gene.transcripts.find(
    (transcript: any) => transcript.transcript_id === gene.mane_select_transcript.ensembl_id
  )
  const shouldLinkToTranscriptPage =
    gencodeVersionOfManeSelectTransript &&
    gencodeVersionOfManeSelectTransript.transcript_version ===
      gene.mane_select_transcript.ensembl_version

  return (
    <React.Fragment>
      {shouldLinkToTranscriptPage ? (
        <Link to={`/transcript/${gene.mane_select_transcript.ensembl_id}`}>
          {gene.mane_select_transcript.ensembl_id}.{gene.mane_select_transcript.ensembl_version}
        </Link>
      ) : (
        `${gene.mane_select_transcript.ensembl_id}.${gene.mane_select_transcript.ensembl_version}`
      )}{' '}
      / {gene.mane_select_transcript.refseq_id}.{gene.mane_select_transcript.refseq_version}
    </React.Fragment>
  )
}

type GeneInfoProps = {
  gene: {
    gene_id: string
    gene_version: string
    symbol: string
    gencode_symbol: string
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
    canonical_transcript_id?: string
    mane_select_transcript?: {
      ensembl_id: string
      ensembl_version: string
      refseq_id: string
      refseq_version: string
    }
    transcripts: {
      transcript_id: string
      transcript_version: string
    }[]
  }
}

const GeneInfo = ({ gene }: GeneInfoProps) => {
  const canonicalTranscript = gene.canonical_transcript_id
    ? gene.transcripts.find(
        (transcript: any) => transcript.transcript_id === gene.canonical_transcript_id
      )
    : null

  const ucscReferenceGenomeId = gene.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const gencodeVersion = gene.reference_genome === 'GRCh37' ? '19' : '35'

  const otherTranscripts = gene.transcripts.filter(
    (transcript) =>
      transcript.transcript_id !== (canonicalTranscript || {}).transcript_id &&
      transcript.transcript_id !== (gene.mane_select_transcript || {}).ensembl_id
  )

  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeListItem label="Genome build">
        {gene.reference_genome} / {ucscReferenceGenomeId}
      </AttributeListItem>

      <AttributeListItem label="Ensembl gene ID">
        {gene.gene_id}.{gene.gene_version}
      </AttributeListItem>

      {gene.symbol !== gene.gencode_symbol && (
        <AttributeListItem label={`Symbol in GENCODE v${gencodeVersion}`}>
          {gene.gencode_symbol}
        </AttributeListItem>
      )}

      {gene.reference_genome === 'GRCh38' && (
        <AttributeListItem
          label={
            <React.Fragment>
              MANE Select transcript <InfoButton topic="mane-select-transcript" />
            </React.Fragment>
          }
        >
          {/* @ts-expect-error TS(2322) FIXME: Type '{ gene_id: string; gene_version: string; sym... Remove this comment to see the full error message */}
          {gene.mane_select_transcript ? <ManeSelectTranscriptId gene={gene} /> : 'Not available'}
        </AttributeListItem>
      )}

      <AttributeListItem
        label={
          <React.Fragment>
            Ensembl canonical transcript <InfoButton topic="canonical-transcript" />
          </React.Fragment>
        }
      >
        {canonicalTranscript ? (
          <Link to={`/transcript/${canonicalTranscript.transcript_id}`}>
            {canonicalTranscript.transcript_id}.{canonicalTranscript.transcript_version}
          </Link>
        ) : (
          'Not available'
        )}
      </AttributeListItem>

      {otherTranscripts.length > 0 && (
        <AttributeListItem label="Other transcripts">
          <InlineList
            items={otherTranscripts.map((transcript) => (
              <Link to={`/transcript/${transcript.transcript_id}`}>
                {transcript.transcript_id}.{transcript.transcript_version}
              </Link>
            ))}
            label="Other transcripts"
          />
        </AttributeListItem>
      )}

      <AttributeListItem label="Region">
        <Link to={`/region/${gene.chrom}-${gene.start}-${gene.stop}`}>
          {gene.chrom}:{gene.start}-{gene.stop}
        </Link>
      </AttributeListItem>

      <AttributeListItem label="External resources">
        <GeneReferences gene={gene} />
      </AttributeListItem>
    </AttributeList>
  )
}

export default GeneInfo
