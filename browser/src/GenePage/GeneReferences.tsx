import React, { useState } from 'react'

import { ExternalLink, List, ListItem, Modal, TextButton } from '@gnomad/ui'

type Props = {
  gene: {
    gene_id: string
    reference_genome: 'GRCh37' | 'GRCh38'
    symbol: string
    chrom: string
    start: number
    stop: number
    hgnc_id?: string
    ncbi_id?: string
    omim_id?: string
  }
}

const GeneReferences = ({ gene }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const {
    gene_id: geneId,
    symbol: geneSymbol,
    reference_genome: referenceGenome,
    chrom,
    start,
    stop,
    hgnc_id: hgncId,
    ncbi_id: ncbiId,
    omim_id: omimId,
  } = gene

  const ensemblGeneUrl = `https://${
    referenceGenome === 'GRCh37' ? 'grch37.' : ''
  }ensembl.org/Homo_sapiens/Gene/Summary?g=${geneId}`

  const ucscReferenceGenomeId = referenceGenome === 'GRCh37' ? 'hg19' : 'hg38'
  const ucscUrl = `https://genome.ucsc.edu/cgi-bin/hgTracks?db=${ucscReferenceGenomeId}&position=chr${chrom}%3A${start}-${stop}`

  const gtexUrl = `https://gtexportal.org/home/gene/${geneId}`

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
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; initialFocusOnButton: b... Remove this comment to see the full error message
          initialFocusOnButton={false}
          onRequestClose={() => {
            setIsExpanded(false)
          }}
          title={`External resources for ${geneSymbol}`}
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
                href={`https://deciphergenomics.org/gene/${geneId}/overview/protein-genomic-info`}
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
            {ncbiId && (
              <>
                <ListItem>
                  <ExternalLink href={`https://www.ncbi.nlm.nih.gov/gene/?term=${ncbiId}`}>
                    NCBI
                  </ExternalLink>
                </ListItem>
                <ListItem>
                  <ExternalLink
                    href={`https://www.ncbi.nlm.nih.gov/genome/gdv/browser/gene/?id=${ncbiId}`}
                  >
                    NCBI Genome Data Viewer
                  </ExternalLink>
                </ListItem>
                <ListItem>
                  <ExternalLink href={gtexUrl}>GTEx</ExternalLink>
                </ListItem>
              </>
            )}
          </List>
        </Modal>
      )}
    </React.Fragment>
  )
}

export default GeneReferences
