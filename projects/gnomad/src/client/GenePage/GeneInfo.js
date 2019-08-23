import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@broad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'

const GeneReferences = ({ gene }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const {
    chrom,
    gene_name: geneName,
    gene_id: geneId,
    omim_accession: omimAccession,
    start,
    stop,
  } = gene

  const ensemblGeneUrl = `https://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g=${geneId}`

  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chrom}%3A${start}-${stop}`

  return (
    <React.Fragment>
      <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>,{' '}
      <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>,{' '}
      <TextButton
        onClick={() => {
          setIsExpanded(true)
        }}
      >
        and {omimAccession ? '3' : '2'} more
      </TextButton>
      {isExpanded && (
        <Modal
          initialFocusOnButton={false}
          onRequestClose={() => {
            setIsExpanded(false)
          }}
          title={`References for ${geneName}`}
        >
          <List>
            <ListItem>
              <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>
            </ListItem>
            <ListItem>
              <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
            </ListItem>
            <ListItem>
              <ExternalLink href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${geneName}`}>
                GeneCards
              </ExternalLink>
            </ListItem>
            {omimAccession && (
              <ListItem>
                <ExternalLink href={`https://omim.org/entry/${omimAccession}`}>OMIM</ExternalLink>
              </ListItem>
            )}
            <ListItem>
              <ExternalLink href={`https://decipher.sanger.ac.uk/gene/${geneId}`}>
                DECIPHER
              </ExternalLink>
            </ListItem>
          </List>
        </Modal>
      )}
    </React.Fragment>
  )
}

GeneReferences.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    gene_name: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    omim_accession: PropTypes.string,
  }).isRequired,
}

const GeneInfo = ({ gene }) => {
  const { gene_id: geneId, chrom, start, stop, canonical_transcript: canonicalTranscript } = gene

  return (
    <AttributeList labelWidth={160}>
      <AttributeList.Item label="Genome build">GRCh37 / hg19</AttributeList.Item>
      <AttributeList.Item label="Ensembl gene ID">{geneId}</AttributeList.Item>
      <AttributeList.Item label="Canonical transcript ID">{canonicalTranscript}</AttributeList.Item>
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
    gene_name: PropTypes.string.isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    canonical_transcript: PropTypes.string.isRequired,
    omim_accession: PropTypes.string,
  }).isRequired,
}

export default GeneInfo
