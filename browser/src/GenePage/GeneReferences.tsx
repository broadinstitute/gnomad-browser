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

  return (
    <React.Fragment>
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>,{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
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
          {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <List>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink href={ensemblGeneUrl}>Ensembl</ExternalLink>
            </ListItem>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink href={ucscUrl}>UCSC Browser</ExternalLink>
            </ListItem>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink
                href={`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${geneSymbol}`}
              >
                GeneCards
              </ExternalLink>
            </ListItem>
            {omimId && (
              // @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
              <ListItem>
                {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                <ExternalLink href={`https://omim.org/entry/${omimId}`}>OMIM</ExternalLink>
              </ListItem>
            )}
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink
                href={`https://decipher.sanger.ac.uk/gene/${geneId}/overview/protein-genomic-info`}
              >
                DECIPHER
              </ExternalLink>
            </ListItem>
            {hgncId && (
              <>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink href={`https://search.clinicalgenome.org/kb/genes/${hgncId}`}>
                    ClinGen
                  </ExternalLink>
                </ListItem>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink href={`https://search.thegencc.org/genes/${hgncId}`}>
                    Gene Curation Coalition (GenCC)
                  </ExternalLink>
                </ListItem>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
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
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink href={`https://www.ncbi.nlm.nih.gov/gene/?term=${ncbiId}`}>
                    NCBI
                  </ExternalLink>
                </ListItem>
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <ListItem>
                  {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
                  <ExternalLink
                    href={`https://www.ncbi.nlm.nih.gov/genome/gdv/browser/gene/?id=${ncbiId}`}
                  >
                    NCBI Genome Data Viewer
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

export default GeneReferences
