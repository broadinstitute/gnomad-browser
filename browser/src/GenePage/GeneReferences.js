import React, { useState } from 'react'
import PropTypes from 'prop-types'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@gnomad/ui'

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
                href={`https://decipher.sanger.ac.uk/gene/${geneId}/overview/protein-genomic-info`}
              >
                DECIPHER
              </ExternalLink>
            </ListItem>
            {hgncId && (
              <>
                <ListItem>
                  <ExternalLink href={`https://search.clinicalgenome.org/kb/genes/${hgncId}`}>
                    ClinGen
                  </ExternalLink>
                </ListItem>
                <ListItem>
                  <ExternalLink href={`https://search.thegencc.org/genes/${hgncId}`}>
                    Gene Curation Coalition (GenCC)
                  </ExternalLink>
                </ListItem>
                <ListItem>
                  <ExternalLink
                    href={`https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${hgncId}`}
                  >
                    HGNC
                  </ExternalLink>
                </ListItem>
              </>
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

export default GeneReferences
