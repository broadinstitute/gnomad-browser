import { GraphQLError, type ASTVisitor, type ValidationContext } from 'graphql'

export const JOINED_PHASED_METHYLATION_QUERY_COST = 25
export const JOINED_PHASED_METHYLATION_CAPABILITY_QUERY_COST = 10
export const JOINED_PHASED_METHYLATION_MAX_FIELDS_PER_DOCUMENT = 1

// Cost is the primary amplification control. These independent document-level caps
// remain fail-closed if a deployment raises MAX_QUERY_COST in the future.
export const joinedPhasedMethylationSingleFieldRule = (context: ValidationContext): ASTVisitor => {
  let joinedRegionFields = 0
  let joinedCapabilityFields = 0
  return {
    Field(node) {
      if (node.name.value === 'joined_phased_methylation_region') {
        joinedRegionFields += 1
        if (joinedRegionFields > JOINED_PHASED_METHYLATION_MAX_FIELDS_PER_DOCUMENT) {
          context.reportError(
            new GraphQLError(
              'Only one joined_phased_methylation_region field is allowed per GraphQL document.',
              [node]
            )
          )
        }
      }
      if (node.name.value === 'joined_phased_methylation_capability') {
        joinedCapabilityFields += 1
        if (joinedCapabilityFields > JOINED_PHASED_METHYLATION_MAX_FIELDS_PER_DOCUMENT) {
          context.reportError(
            new GraphQLError(
              'Only one joined_phased_methylation_capability field is allowed per GraphQL document.',
              [node]
            )
          )
        }
      }
    },
  }
}
