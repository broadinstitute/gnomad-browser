import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@broad/ui'

import AttributeList from '../AttributeList'
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
    symbol: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    hgnc_id: PropTypes.string,
    omim_id: PropTypes.string,
  }).isRequired,
}

const GeneInfo = ({ gene }) => {
  const {
    gene_id: geneId,
    reference_genome: referenceGenome,
    chrom,
    start,
    stop,
    canonical_transcript_id: canonicalTranscriptId,
  } = gene

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'

  return (
    <AttributeList labelWidth={160}>
      <AttributeList.Item label="Genome build">
        {referenceGenome} / {ucscReferenceGenomeId}
      </AttributeList.Item>
      <AttributeList.Item label="Ensembl gene ID">{geneId}</AttributeList.Item>
      {canonicalTranscriptId && (
        <AttributeList.Item label="Canonical transcript ID">
          {canonicalTranscriptId}
        </AttributeList.Item>
      )}
      <AttributeList.Item label="Region">
        <Link to={`/region/${chrom}-${start}-${stop}`}>
          {chrom}:{start}-{stop}
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
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    canonical_transcript_id: PropTypes.string,
  }).isRequired,
}

export default GeneInfo
