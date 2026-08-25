import { GraphQLError, ValidationContext } from 'graphql'

const ROOT_FIELD = 'long_read_tandem_repeat_short_read_distributions'
const ALLELE_PART = 'LongReadTrShortReadAlleleDistributionPart'
const GENOTYPE_PART = 'LongReadTrShortReadGenotypeDistributionPart'
const ALIAS_PROTECTED_PARENT_TYPES = new Set([
  'LongReadTrShortReadDistributions',
  'LongReadTrLocusComponent',
  'ShortTandemRepeatReferenceRegion',
  ALLELE_PART,
  GENOTYPE_PART,
  'ShortTandemRepeatAlleleSizeDistributionCohort',
  'ShortTandemRepeatAlleleSizeItem',
  'ShortTandemRepeatGenotypeDistributionCohort',
  'ShortTandemRepeatGenotypeItem',
])

// The resolver bounds one aggregate response object. Repeating the root field or either
// large nested list through aliases would amplify the serialized GraphQL response after
// that bound has been checked, so each may be selected at most once per document.
export const longReadTrShortReadDistributionSingleSelectionRule = (context: ValidationContext) => {
  let rootSelections = 0
  let alleleDistributionSelections = 0
  let genotypeDistributionSelections = 0

  const rejectRepeated = (node: any, label: string) =>
    context.reportError(
      new GraphQLError(`${label} may be selected only once per GraphQL document`, [node])
    )

  return {
    Field(node: any) {
      const fieldName = node.name.value
      const parentType = context.getParentType()?.name
      if (node.alias && parentType && ALIAS_PROTECTED_PARENT_TYPES.has(parentType)) {
        context.reportError(
          new GraphQLError(`Aliases are not allowed inside the bounded ${ROOT_FIELD} response`, [
            node,
          ])
        )
      }
      if (parentType === 'Query' && fieldName === ROOT_FIELD) {
        rootSelections += 1
        if (rootSelections > 1) rejectRepeated(node, ROOT_FIELD)
      } else if (fieldName === 'distributions' && parentType === ALLELE_PART) {
        alleleDistributionSelections += 1
        if (alleleDistributionSelections > 1) {
          rejectRepeated(node, `${ALLELE_PART}.distributions`)
        }
      } else if (fieldName === 'distributions' && parentType === GENOTYPE_PART) {
        genotypeDistributionSelections += 1
        if (genotypeDistributionSelections > 1) {
          rejectRepeated(node, `${GENOTYPE_PART}.distributions`)
        }
      }
    },
  }
}
