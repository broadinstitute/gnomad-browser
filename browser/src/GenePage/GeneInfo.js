import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import InfoButton from '../help/InfoButton'
import Link from '../Link'

const GeneReferences = ({ gene }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const {
    gene_id: geneId,
    symbol: geneSymbol,
    reference_genome: referenceGenome,
    chrom,
    start,
    stop,
    hgnc_id: hgncId,
    omim_id: omimId,
  } = gene

  const ensemblGeneUrl = `https://${
    referenceGenome === 'GRCh37' ? 'grch37.' : ''
  }ensembl.org/Homo_sapiens/Gene/Summary?g=${geneId}`

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'
  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${start}-${stop}`

  return (
    <React.Fragment>
      <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>,{' '}
      <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>,{' '}
      <TextButton
        onClick={() => {
          setIsExpanded(true)
        }}
      >
        and more
      </TextButton>
      {isExpanded && (
        <Modal
          initialFocusOnButton={false}
          onRequestClose={() => {
            setIsExpanded(false)
          }}
          title={`References for ${geneSymbol}`}
        >
          <List>
            <ListItem>
              <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>
            </ListItem>
            <ListItem>
              <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
            </ListItem>
            <ListItem>
              <ExternalLink
                href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${geneSymbol}`}
              >
                GeneCards
              </ExternalLink>
            </ListItem>
            {omimId && (
              <ListItem>
                <ExternalLink href={`https://omim.org/entry/${omimId}`}>OMIM</ExternalLink>
              </ListItem>
            )}
            <ListItem>
              <ExternalLink
                href={`https://decipher.sanger.ac.uk/gene/${geneId}#overview/protein-info`}
              >
                DECIPHER
              </ExternalLink>
            </ListItem>
            {hgncId && (
              <ListItem>
                <ExternalLink href={`https://search.clinicalgenome.org/kb/genes/${hgncId}`}>
                  ClinGen
                </ExternalLink>
              </ListItem>
            )}
            {hgncId && (
              <ListItem>
                <ExternalLink
                  href={`https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${hgncId}`}
                >
                  HGNC
                </ExternalLink>
              </ListItem>
            )}
          </List>
        </Modal>
      )}
    </React.Fragment>
  )
}

GeneReferences.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    symbol: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    hgnc_id: PropTypes.string,
    omim_id: PropTypes.string,
  }).isRequired,
}

const ManeSelectTranscriptId = ({ gene }) => {
  const gencodeVersionOfManeSelectTransript = gene.transcripts.find(
    transcript => transcript.transcript_id === gene.mane_select_transcript.ensembl_id
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

ManeSelectTranscriptId.propTypes = {
  gene: PropTypes.shape({
    mane_select_transcript: PropTypes.shape({
      ensembl_id: PropTypes.string.isRequired,
      ensembl_version: PropTypes.string.isRequired,
      refseq_id: PropTypes.string.isRequired,
      refseq_version: PropTypes.string.isRequired,
    }).isRequired,
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

const OtherTranscripts = ({ transcripts }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <Link key={transcripts[0].transcript_id} to={`/transcript/${transcripts[0].transcript_id}`}>
        {transcripts[0].transcript_id}.{transcripts[0].transcript_version}
      </Link>
      {transcripts.length > 1 && (
        <>
          ,{' '}
          <Link
            key={transcripts[1].transcript_id}
            to={`/transcript/${transcripts[1].transcript_id}`}
          >
            {transcripts[1].transcript_id}.{transcripts[1].transcript_version}
          </Link>
        </>
      )}
      {transcripts.length > 2 && (
        <>
          ,{' '}
          <TextButton
            onClick={() => {
              setIsExpanded(true)
            }}
          >
            and {transcripts.length - 2} more
          </TextButton>
        </>
      )}
      {isExpanded && (
        <Modal
          initialFocusOnButton={false}
          title="Other transcripts"
          onRequestClose={() => setIsExpanded(false)}
        >
          <List>
            {transcripts.map(transcript => (
              <ListItem key={transcript.transcript_id}>
                <Link to={`/transcript/${transcript.transcript_id}`}>
                  {transcript.transcript_id}.{transcript.transcript_version}
                </Link>
              </ListItem>
            ))}
          </List>
        </Modal>
      )}
    </>
  )
}

OtherTranscripts.propTypes = {
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      transcript_version: PropTypes.string.isRequired,
    })
  ).isRequired,
}

const GeneInfo = ({ gene }) => {
  const canonicalTranscript = gene.canonical_transcript_id
    ? gene.transcripts.find(transcript => transcript.transcript_id === gene.canonical_transcript_id)
    : null

  const ucscReferenceGenomeId = gene.reference_genome === 'GRCh37' ? 'hg19' : 'hg38'
  const gencodeVersion = gene.reference_genome === 'GRCh37' ? '19' : '35'

  const otherTranscripts = gene.transcripts.filter(
    transcript =>
      transcript.transcript_id !== (canonicalTranscript || {}).transcript_id &&
      transcript.transcript_id !== (gene.mane_select_transcript || {}).ensembl_id
  )

  return (
    <AttributeList labelWidth={225}>
      <AttributeList.Item label="Genome build">
        {gene.reference_genome} / {ucscReferenceGenomeId}
      </AttributeList.Item>

      <AttributeList.Item label="Ensembl gene ID">
        {gene.gene_id}.{gene.gene_version}
      </AttributeList.Item>

      {gene.symbol !== gene.gencode_symbol && (
        <AttributeList.Item label={`Symbol in GENCODE v${gencodeVersion}`}>
          {gene.gencode_symbol}
        </AttributeList.Item>
      )}

      {gene.reference_genome === 'GRCh38' && (
        <AttributeList.Item
          label={
            <React.Fragment>
              MANE Select transcript <InfoButton topic="mane_select_transcript" />
            </React.Fragment>
          }
        >
          {gene.mane_select_transcript ? <ManeSelectTranscriptId gene={gene} /> : 'Not available'}
        </AttributeList.Item>
      )}

      <AttributeList.Item
        label={
          <React.Fragment>
            Ensembl canonical transcript <InfoButton topic="canonical_transcript" />
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
      </AttributeList.Item>

      {otherTranscripts.length > 0 && (
        <AttributeList.Item label="Other transcripts">
          <OtherTranscripts transcripts={otherTranscripts} />
        </AttributeList.Item>
      )}

      <AttributeList.Item label="Region">
        <Link to={`/region/${gene.chrom}-${gene.start}-${gene.stop}`}>
          {gene.chrom}:{gene.start}-{gene.stop}
        </Link>
      </AttributeList.Item>

      <AttributeList.Item label="References">
        <GeneReferences gene={gene} />
      </AttributeList.Item>
    </AttributeList>
  )
}

GeneInfo.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    gene_version: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    gencode_symbol: PropTypes.string.isRequired,
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    canonical_transcript_id: PropTypes.string,
    mane_select_transcript: PropTypes.shape({
      ensembl_id: PropTypes.string.isRequired,
      ensembl_version: PropTypes.string.isRequired,
      refseq_id: PropTypes.string.isRequired,
      refseq_version: PropTypes.string.isRequired,
    }),
    transcripts: PropTypes.arrayOf(
      PropTypes.shape({
        transcript_id: PropTypes.string.isRequired,
        transcript_version: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
}

export default GeneInfo
