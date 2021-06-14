import PropTypes from 'prop-types'
import React from 'react'

import { Badge, ExternalLink } from '@gnomad/ui'

const GeneFlags = ({ gene }) => {
  return (
    <>
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
          for{' '}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2308-7">
            <em>The mutational constraint spectrum quantified from variation in 141,456 humans</em>
          </ExternalLink>{' '}
          and{' '}
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

GeneFlags.propTypes = {
  gene: PropTypes.shape({
    flags: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
}

export default GeneFlags
