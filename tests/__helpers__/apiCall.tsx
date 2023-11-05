import { Mock } from 'jest-mock'

export type ApiCallParameters = { body: { variables: any } }

export const apiCallsMatching = (
  mockFetch: Mock<any>,
  callIdentifier: string
): ApiCallParameters[] => {
  const calls = (mockFetch.mock.calls as unknown) as [string, { body: string }][]
  const matchingQueries = calls.filter((kall) => {
    if (!RegExp('api/?$').test(kall[0])) {
      return false
    }

    const query: string = JSON.parse(kall[1].body).query
    return query.includes(callIdentifier)
  })

  return matchingQueries.map((matchingQuery) => {
    const parsedBody = JSON.parse(matchingQuery[1].body)
    return { body: { variables: parsedBody.variables } }
  })
}
