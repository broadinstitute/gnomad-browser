import React from 'react'
import PropTypes from 'prop-types'

import { ExternalLink } from '@broad/ui'

import AttributeList from '../AttributeList'

const GeneInfo = ({ currentTranscript, gene }) => {
  const {
    canonical_transcript: canonicalTranscript,
    chrom,
    gene_name: geneName,
    gene_id: geneId,
    omim_accession: omimAccession,
    start,
    stop,
  } = gene

  const ensemblGeneUrl = `http://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g=${geneId}`
  const ensemblTranscriptUrl = `http://grch37.ensembl.org/Homo_sapiens/Transcript/Summary?t=${currentTranscript ||
    canonicalTranscript}`
  const ucscUrl = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${start -
    1}-${stop}`
  const geneCardsUrl = `http://www.genecards.org/cgi-bin/carddisp.pl?gene=${geneName}`
  const omimUrl = `http://omim.org/entry/${omimAccession}`

  return (
    <AttributeList labelWidth={160}>
      <AttributeList.Item label="Ensembl gene ID">
        <ExternalLink href={ensemblGeneUrl}>{geneId}</ExternalLink>
      </AttributeList.Item>
      <AttributeList.Item label="Ensembl transcript ID">
        <ExternalLink href={ensemblTranscriptUrl}>
          {currentTranscript}
          {currentTranscript === canonicalTranscript && ' (canonical)'}
        </ExternalLink>
      </AttributeList.Item>
      <AttributeList.Item label="UCSC Browser">
        <ExternalLink href={ucscUrl}>{`${chrom}:${start}-${stop}`}</ExternalLink>
      </AttributeList.Item>
      <AttributeList.Item label="GeneCards">
        <ExternalLink href={geneCardsUrl}>{geneName}</ExternalLink>
      </AttributeList.Item>
      <AttributeList.Item label="OMIM">
        {omimAccession ? <ExternalLink href={omimUrl}>{omimAccession}</ExternalLink> : '—'}
      </AttributeList.Item>
    </AttributeList>
  )
}

GeneInfo.propTypes = {
  currentTranscript: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    canonical_transcript: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    gene_name: PropTypes.string.isRequired,
    gene_id: PropTypes.string.isRequired,
    omim_accession: PropTypes.string,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default GeneInfo
