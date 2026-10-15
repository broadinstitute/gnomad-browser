import { readFileSync } from 'fs'
import path from 'path'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'

import aliasResolvers from './resolvers/aliases'

const schema = makeExecutableSchema({
  typeDefs: [
    readFileSync(path.join(__dirname, 'types/constraint/exac-constraint.graphql'), 'utf8'),
    'type Query { exac_constraint: ExacConstraint }',
  ],
  resolvers: { ExacConstraint: aliasResolvers.ExacConstraint },
})

test.each([null, 0, 0.95, undefined])('preserves ExAC constraint when pli is %s', async (pli) => {
  const result = await graphql({
    schema,
    source: '{ exac_constraint { pli pLI exp_lof obs_lof } }',
    rootValue: { exac_constraint: { pli, exp_lof: 3.5, obs_lof: 3 } },
  })

  expect(result.errors).toBeUndefined()
  expect(result.data).toEqual({
    exac_constraint: { pli: pli ?? null, pLI: pli ?? null, exp_lof: 3.5, obs_lof: 3 },
  })
})
