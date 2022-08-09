// Utility functions to work with graphQL, from :
//   https://docs.cypress.io/guides/end-to-end-testing/working-with-graphql#Alias-multiple-queries-or-mutations

import { CyHttpMessages } from 'cypress/types/net-stubbing'

// Utilitiy to match GraphQL mutation based on the operation name
export const hasOperationName = (
  req: CyHttpMessages.IncomingHttpRequest,
  operationName: string
) => {
  const { body } = req
  // eslint-disable-next-line no-prototype-builtins
  return body.hasOwnProperty('operationName') && body.operationName === operationName
}

// Alias query if operationName matches
export const aliasQuery = (req: CyHttpMessages.IncomingHttpRequest, operationName: string) => {
  if (hasOperationName(req, operationName)) {
    req.alias = `gql${operationName}Query`
  }
}

// Alias mutation if operationName matches
export const aliasMutation = (req: CyHttpMessages.IncomingHttpRequest, operationName: string) => {
  if (hasOperationName(req, operationName)) {
    req.alias = `gql${operationName}Mutation`
  }
}
