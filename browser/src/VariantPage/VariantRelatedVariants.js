import PropTypes from 'prop-types'
import React from 'react'

import Link from '../Link'
import MNVSummaryList from '../MNVPage/MNVSummaryList'
import { getConsequenceRank } from '../vepConsequences'
import VariantLiftover from './VariantLiftover'

export const variantHasRelatedVariants = (variant, datasetId) => {
  const hasColocatedVariants = (variant.colocated_variants || []).length > 0
  const hasRelatedMultiNucleotideVariants = (variant.multi_nucleotide_variants || []).length > 0
  const hasLiftover = (variant.liftover || variant.liftover_sources || []).length > 0
  const hasCooccurrence =
    datasetId === 'gnomad_r2_1' &&
    ((variant.exome || {}).ac || 0) / ((variant.exome || {}).an || 1) <= 0.05

  return hasColocatedVariants || hasRelatedMultiNucleotideVariants || hasLiftover || hasCooccurrence
}

const VariantRelatedVariants = ({ datasetId, variant }) => {
  return (
    <>
      {variant.colocated_variants && variant.colocated_variants.length > 0 && (
        <div>
          <h3>Other Alternate Alleles</h3>
          <p>This variant is multiallelic. Other alternate alleles are:</p>
          <ul>
            {variant.colocated_variants.map(colocatedVariantId => (
              <li key={colocatedVariantId}>
                <Link to={`/variant/${colocatedVariantId}`}>{colocatedVariantId}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(variant.multi_nucleotide_variants || []).length > 0 && (
        <div>
          <h3>Multi-nucleotide Variants</h3>
          <p>This variant&apos;s consequence may be affected by other variants:</p>
          <MNVSummaryList multiNucleotideVariants={variant.multi_nucleotide_variants} />
        </div>
      )}

      {(variant.liftover || variant.liftover_sources || []).length > 0 && (
        <VariantLiftover variant={variant} />
      )}

      {datasetId === 'gnomad_r2_1' &&
        ((variant.exome || {}).ac || 0) / ((variant.exome || {}).an || 1) <= 0.05 &&
        Math.min(
          ...variant.transcript_consequences.map(csq => getConsequenceRank(csq.major_consequence))
        ) <= getConsequenceRank('3_prime_UTR_variant') && (
          <div>
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
          </div>
        )}
    </>
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
