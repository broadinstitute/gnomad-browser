import { GraphQLEnumType } from 'graphql'

import browserConfig from '@browser/config'

export const AnalysisGroupArgumentType = new GraphQLEnumType({
  name: 'AnalysisGroupId',
  values: browserConfig.analysisGroups.selectableGroups.reduce(
    (values, analysisGroup) => ({ ...values, [analysisGroup]: {} }),
    {}
  ),
})
