// There is a certain amount of boilerplate involved in using the query
// test helpers, so this file exists as an annotated working example.
//
// Start like you would any test:
import React from 'react'
import renderer from 'react-test-renderer'

// These next imports must appear in this order
import { jest, expect } from '@jest/globals'
import { mockQueries } from '../../tests/__helpers__/queries'
import Query, { BaseQuery } from './Query'

// You'd think that you can wrap this in a helper function in queries.tsx,
// but it won't work if you do.
jest.mock('./Query', () => {
  const originalModule = jest.requireActual('./Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

// This is the API that your tests will use to interact with the mock queries
const { resetMockApiCalls, resetMockApiResponses, simulateApiResponse, setMockApiResponses } =
  mockQueries()

// You can do this on a test-by-test basis too, rather than beforeEach.
beforeEach(() => {
  Query.mockImplementation(
    jest.fn(({ query, children, operationName, variables }) =>
      simulateApiResponse('Query', query, children, operationName, variables)
    )
  )
  // The semicolon is due to a quirk of JS/TS parsing--try taking it out and
  // you'll see what happens.
  // Also, it's not clear why we have to cast BaseQuery here but not Query
  // above.
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ query, children, operationName, variables }) =>
      simulateApiResponse('BaseQuery', query, children, operationName, variables)
    )
  )
})

// Mock query calls are not cleaned up automatically
afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

// Now for the example code proper.

const ExampleInnerComponent = ({ content }: { content: any }) => (
  <>
    My content is as follows:
    <pre>{JSON.stringify(content)}</pre>
  </>
)

// The following is a simplified version, with no loading state or error
// handling, of the Query/BaseQuery boilerplate that's copy/pasted throughout
// the code.
const ExampleQuery = () => (
  <BaseQuery query="fakeQuery" operationName="exampleOperation" variables={{}}>
    {({ data }: any) => {
      return <ExampleInnerComponent content={data.content!} />
    }}
  </BaseQuery>
)

const ExampleOuterComponent = () => (
  <div>
    The fake query results go here: <ExampleQuery />
  </div>
)

describe('query helpers', () => {
  test('get out the data you put in', () => {
    // The argument to setMockApiResponses is keyed by operation name
    setMockApiResponses({
      exampleOperation: () => ({
        content: ['a', { one: 'two' }, 999],
      }),
    })

    const tree = renderer.create(<ExampleOuterComponent />)
    expect(tree).toMatchSnapshot()
  })
})
