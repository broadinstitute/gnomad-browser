import { jest, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import { readsApiOutputFactory, exomeReadApiOutputFactory } from '../__factories__/ReadData'
import ReadDataContainer from './ReadData'
import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import { withDummyRouter } from '../../../tests/__helpers__/router'

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

forAllDatasets('ReadData with "%s" dataset selected', (datasetId) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      withDummyRouter(<ReadDataContainer datasetId={datasetId} variantIds={[variantId]} />)
    )
    expect(tree).toMatchSnapshot()
  })
})
