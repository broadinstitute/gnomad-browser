import React from 'react'

import { Badge, ExternalLink } from '@gnomad/ui'

import { ReferenceGenome } from '@gnomad/dataset-metadata/metadata'

type Props = {
  gene: {
    flags: string[]
    symbol: string
    reference_genome: ReferenceGenome
  }
}

const allOfUsCMRGGenes = ['CBS', 'KCNE1', 'CRYAA']

const GeneFlags = ({ gene }: Props) => {
  const shouldDisplayCMRGWarning =
    gene.reference_genome === 'GRCh38' && allOfUsCMRGGenes.includes(gene.symbol)

  return (
    <>
      {shouldDisplayCMRGWarning && (
        <p>
          <Badge level="warning">Warning</Badge> Variant calls in this gene may be missing or
          unreliable due to{' '}
          <ExternalLink href="https://www.nature.com/articles/s41587-021-01158-1">
            false duplications in the GRCh38 reference
          </ExternalLink>
          . We will be working on integrating data from the All of Us challenging medically relevant
          genes (
          <ExternalLink href="https://support.researchallofus.org/hc/en-us/articles/29475228181908-How-the-All-of-Us-Genomic-data-are-organized#01JQ7ES9YM8KS6PZBF03C8J399">
            CMRG
          </ExternalLink>
          ) callset to remedy this issue in the future.
        </p>
      )}
      {gene.flags.includes('chip') && (
        <p>
          <Badge level="warning">Note</Badge> Analysis of allele balance and age data indicates that
          this gene shows evidence of{' '}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8050831/">
            clonal hematopoiesis of indeterminate potential (CHIP)
          </ExternalLink>
          . The potential presence of somatic variants should be taken into account when
          interpreting the penetrance, pathogenicity, and frequency of assumed germline variants.
          For more information, see pages 37-40 of{' '}
          <ExternalLink href="https://static-content.springer.com/esm/art%3A10.1038%2Fs41586-020-2308-7/MediaObjects/41586_2020_2308_MOESM1_ESM.pdf">
            supplementary information
          </ExternalLink>{' '}
          for
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2308-7">
            <em>The mutational constraint spectrum quantified from variation in 141,456 humans</em>
          </ExternalLink>{' '}
          and
          <ExternalLink href="https://pubmed.ncbi.nlm.nih.gov/28229513/">
            <em>
              Pathogenic ASXL1 somatic variants in reference databases complicate germline variant
              interpretation for Bohring-Opitz Syndrome
            </em>
          </ExternalLink>
          .
        </p>
      )}
    </>
  )
}

export default GeneFlags
