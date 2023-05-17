/* Some things that jest does behind the scenes mean that there is a certain
amount of manual setup involved in using this helper, more than you might
expect. There probably is a way to set up still more of this automatically,
but so far we haven't succeeded in doing so. There are some other odd things
in this helper, but having the ability to mock GraphQL queries in test is
worth jumping through a few hoops.

The necessary setup is demonstrated in browser/src/queryHelperExample.spec.tsx.
*/

import React, { ReactNode } from 'react'

export type Children = ({ data }: { data: any }) => ReactNode
export type MockQueryArgs = {
  children: Children
  operationName: string
  variables: Record<string, any>
}
export type MockApiResponses = Record<string, any>
export type MockApiRequest = {
  operationName: string
  variables: Record<string, any>
  query: string
}

export const mockQueries = () => {
  let mockApiRequests: MockApiRequest[] = []
  let mockApiResponses: MockApiResponses = {}

  const simulateApiResponse = (
    mockedComponentName: string,
    query: string,
    children: Children,
    operationName: string,
    variables: Record<string, any>
  ) => {
    mockApiRequests.push({ operationName, variables, query })
    const mockApiResponseFactory = mockApiResponses[operationName]
    if (mockApiResponseFactory) {
      const mockApiResponse = mockApiResponseFactory()
      return <>{children({ data: mockApiResponse })}</>
    }
    throw new Error(
      `${mockedComponentName} got unmocked operation "${JSON.stringify(
        operationName
      )}"\nquery was:\n\n${JSON.stringify(query)}`
    )
  }

  const setMockApiResponses = (newResponses: MockApiResponses) => {
    mockApiResponses = newResponses
  }

  const resetMockApiResponses = () => setMockApiResponses({})

  const mockApiCalls = () => mockApiRequests

  const resetMockApiCalls = () => {
    mockApiRequests = []
  }

  return {
    mockApiCalls,
    resetMockApiCalls,
    simulateApiResponse,
    setMockApiResponses,
    resetMockApiResponses,
  }
}
