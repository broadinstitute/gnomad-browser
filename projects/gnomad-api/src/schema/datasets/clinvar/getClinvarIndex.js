import { UserVisibleError } from '../../errors'

const CLINVAR_INDICES = {
  GRCh37: 'clinvar_variants_grch37',
  GRCh38: 'clinvar_variants_grch38',
}

const getClinvarIndex = referenceGenome => {
  const index = CLINVAR_INDICES[referenceGenome]
  if (!index) {
    throw new UserVisibleError(
      `ClinVar variants not available on reference genome ${referenceGenome}`
    )
  }
  return index
}

export default getClinvarIndex
