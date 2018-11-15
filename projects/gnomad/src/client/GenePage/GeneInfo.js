import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { currentTranscript, geneData } from '@broad/redux-genes'
import { isLoadingVariants, variantCount } from '@broad/redux-variants'

import {
  ExternalLink,
  GeneAttributes,
  GeneAttributeKeys,
  GeneAttributeKey,
  GeneAttributeValues,
  GeneAttributeValue,
} from '@broad/ui'

const GeneInfo = ({ currentTranscript, gene, isLoadingVariants, variantCount }) => {
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
    <GeneAttributes>
      <GeneAttributeKeys>
        <GeneAttributeKey>Ensembl gene ID</GeneAttributeKey>
        <GeneAttributeKey>Ensembl transcript ID</GeneAttributeKey>
        <GeneAttributeKey>Number of variants</GeneAttributeKey>
        <GeneAttributeKey>UCSC Browser</GeneAttributeKey>
        <GeneAttributeKey>GeneCards</GeneAttributeKey>
        <GeneAttributeKey>OMIM</GeneAttributeKey>
      </GeneAttributeKeys>
      <GeneAttributeValues>
        <GeneAttributeValue>
          <ExternalLink href={ensemblGeneUrl}>{geneId}</ExternalLink>
        </GeneAttributeValue>
        <GeneAttributeValue>
          <ExternalLink href={ensemblTranscriptUrl}>
            {currentTranscript || canonicalTranscript}
            {(currentTranscript === null || currentTranscript === canonicalTranscript) &&
              ' (canonical)'}
          </ExternalLink>
        </GeneAttributeValue>
        <GeneAttributeValue>
          {isLoadingVariants
            ? '—'
            : `${variantCount.toLocaleString()} (including filtered variants)`}
        </GeneAttributeValue>
        <GeneAttributeValue>
          <ExternalLink href={ucscUrl}>{`${chrom}:${start}-${stop}`}</ExternalLink>
        </GeneAttributeValue>
        <GeneAttributeValue>
          <ExternalLink href={geneCardsUrl}>{geneName}</ExternalLink>
        </GeneAttributeValue>
        <GeneAttributeValue>
          {omimAccession ? <ExternalLink href={omimUrl}>{omimAccession}</ExternalLink> : '—'}
        </GeneAttributeValue>
      </GeneAttributeValues>
    </GeneAttributes>
  )
}

GeneInfo.propTypes = {
  currentTranscript: PropTypes.string,
  gene: PropTypes.shape({
    canonical_transcript: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    gene_name: PropTypes.string.isRequired,
    gene_id: PropTypes.string.isRequired,
    omim_accession: PropTypes.string,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  variantCount: PropTypes.number.isRequired,
}

GeneInfo.defaultProps = {
  currentTranscript: undefined,
}

export default connect(state => ({
  currentTranscript: currentTranscript(state),
  gene: geneData(state).toJS(),
  isLoadingVariants: isLoadingVariants(state),
  variantCount: variantCount(state),
}))(GeneInfo)
