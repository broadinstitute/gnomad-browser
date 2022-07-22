import { jest, describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import { Router } from 'react-router'
import renderer from 'react-test-renderer'
import { createBrowserHistory } from 'history'

import { readsApiOutputFactory, exomeReadApiOutputFactory } from '../__factories__/ReadData'
import ReadDataContainer from './ReadData'
import { allDatasetIds } from '../datasets'

const variantId = '123-45-A-G'

jest.mock('../../../graphql-api/src/cache', () => ({
  withCache: (wrappedFunction: any) => wrappedFunction,
}))

let mockGraphqlResponse

const mockEndpoints = {
  '/reads/': readsApiOutputFactory.params({
    variant_0: { exome: exomeReadApiOutputFactory.buildList(1) },
  }),
}

jest.mock('../Query', () => ({
  BaseQuery: ({ children, url }: any) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const mockEndpoint = mockEndpoints[url]
    if (mockEndpoint) {
      const result = mockEndpoint.build()
      mockGraphqlResponse = { data: result }
      return children(mockGraphqlResponse)
    }
    throw `mocked BaseQuery got unexpected URL "${url}"`
  },
}))

jest.mock('./IGVBrowser', () => () => null)

describe.each(allDatasetIds)('ReadData with "%s" dataset selected', (datasetId: any) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <Router history={createBrowserHistory()}>
        <ReadDataContainer datasetId={datasetId} variantIds={[variantId]} />
      </Router>
    )
    expect(tree).toMatchSnapshot()
  })
})
