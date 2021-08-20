import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import Link from '../Link'
import MNVSummaryList from '../MNVPage/MNVSummaryList'
import { getConsequenceRank } from '../vepConsequences'
import VariantLiftover from './VariantLiftover'

const isVariantEligibleForCooccurrence = (variant, datasetId) => {
  if (datasetId !== 'gnomad_r2_1') {
    return false
  }

  const exomeAC = ((variant.exome || {}).ac || 0) / ((variant.exome || {}).an || 1)
  const majorConsequenceRank = Math.min(
    ...variant.transcript_consequences.map(csq => getConsequenceRank(csq.major_consequence))
  )

  return exomeAC <= 0.05 && majorConsequenceRank <= getConsequenceRank('3_prime_UTR_variant')
}

export const variantHasRelatedVariants = (variant, datasetId) => {
  const hasColocatedVariants = (variant.colocated_variants || []).length > 0
  const hasRelatedMultiNucleotideVariants = (variant.multi_nucleotide_variants || []).length > 0
  const hasLiftover = (variant.liftover || variant.liftover_sources || []).length > 0
  const isEligibleForCooccurrence = isVariantEligibleForCooccurrence(variant, datasetId)

  return (
    hasColocatedVariants ||
    hasRelatedMultiNucleotideVariants ||
    hasLiftover ||
    isEligibleForCooccurrence
  )
}

const Wrapper = styled.div`
  columns: 2;
  column-gap: 30px;

  @media (max-width: 992px) {
    columns: 1;
  }
`

const Item = styled.div`
  break-inside: avoid;
`

const VariantRelatedVariants = ({ datasetId, variant }) => {
  return (
    <Wrapper>
      {variant.colocated_variants && variant.colocated_variants.length > 0 && (
        <Item>
          <h3>Other Alternate Alleles</h3>
          <p>This variant is multiallelic. Other alternate alleles are:</p>
          <ul>
            {variant.colocated_variants.map(colocatedVariantId => (
              <li key={colocatedVariantId}>
                <Link to={`/variant/${colocatedVariantId}`}>{colocatedVariantId}</Link>
              </li>
            ))}
          </ul>
        </Item>
      )}

      {(variant.multi_nucleotide_variants || []).length > 0 && (
        <Item>
          <h3>Multi-nucleotide Variants</h3>
          <p>This variant&apos;s consequence may be affected by other variants:</p>
          <MNVSummaryList multiNucleotideVariants={variant.multi_nucleotide_variants} />
        </Item>
      )}

      {(variant.liftover || variant.liftover_sources || []).length > 0 && (
        <Item>
          <h3>Liftover</h3>
          <VariantLiftover variant={variant} />
        </Item>
      )}

      {isVariantEligibleForCooccurrence(variant, datasetId) && (
        <Item>
          <h3>Variant Co-occurrence</h3>
          <p>
            <Link
              to={{
                pathname: '/variant-cooccurrence',
                search: `variant=${variant.variant_id}`,
              }}
            >
              Check if this variant occurs on the same haplotype as another variant.
            </Link>
          </p>
        </Item>
      )}
    </Wrapper>
  )
}

VariantRelatedVariants.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    variant_id: PropTypes.string.isRequired,
    colocated_variants: PropTypes.arrayOf(PropTypes.string),
    liftover: PropTypes.arrayOf(PropTypes.object),
    liftover_sources: PropTypes.arrayOf(PropTypes.object),
    multi_nucleotide_variants: PropTypes.arrayOf(PropTypes.object),
    exome: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    genome: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    transcript_consequences: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
  }).isRequired,
}

export default VariantRelatedVariants
