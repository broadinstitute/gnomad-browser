import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink } from '@broad/ui'

const List = styled.dl`
  dt {
    width: 145px;
    font-weight: bold;
  }

  dd {
    margin-left: 1em;
  }
`

const ListItem = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 0.5em;
`

const GeneAttributes = ({ gene }) => (
  <List>
    <ListItem>
      <dt>Ensembl gene ID</dt>
      <dd>
        <ExternalLink
          href={`https://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g=${gene.gene_id}`}
        >
          {gene.gene_id}
        </ExternalLink>
      </dd>
    </ListItem>
    {gene.canonical_transcript && (
      <ListItem>
        <dt>Ensembl transcript ID</dt>
        <dd>
          <ExternalLink
            href={`https://grch37.ensembl.org/Homo_sapiens/Transcript/Summary?t=${
              gene.canonical_transcript
            }`}
          >
            {gene.canonical_transcript}
          </ExternalLink>
        </dd>
      </ListItem>
    )}
    <ListItem>
      <dt>UCSC Browser</dt>
      <dd>
        <ExternalLink
          href={`https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${gene.chrom}%3A${
            gene.start
          }-${gene.stop}`}
        >{`${gene.chrom}:${gene.start}-${gene.stop}`}</ExternalLink>
      </dd>
    </ListItem>
    <ListItem>
      <dt>GeneCards</dt>
      <dd>
        <ExternalLink href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene.gene_name}`}>
          {gene.gene_name}
        </ExternalLink>
      </dd>
    </ListItem>
    <ListItem>
      <dt>OMIM</dt>
      <dd>
        {gene.omim_accession ? (
          <ExternalLink href={`https://omim.org/entry/${gene.omim_accession}`}>
            {gene.omim_accession}
          </ExternalLink>
        ) : (
          '—'
        )}
      </dd>
    </ListItem>
  </List>
)

GeneAttributes.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    gene_name: PropTypes.string.isRequired,
    canonical_transcript: PropTypes.string,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
    omim_accession: PropTypes.string,
  }).isRequired,
}

export default GeneAttributes
