import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { BrowserRouter } from 'react-router-dom'
import { Button } from '@gnomad/ui'
import { beforeEach, expect, jest, test } from '@jest/globals'

import Query from '../Query'
import Link from '../Link'
import VariantNotFound from './VariantNotFound'

jest.mock('react-sizeme', () => ({
  withSize: () => (Component) => (props) => {
    return <Component {...props} size={{ width: 1000 }} />
  },
}))

jest.mock('../RegionViewer/RegionViewer', () => ({
  __esModule: true,
  default: ({ children }) => {
    return <div>{children}</div>
  },
}))

jest.mock('@gnomad/region-viewer', () => ({
  PositionAxisTrack: () => {
    return null
  },
}))

jest.mock('../Query', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))

beforeEach(() => {
  Query.mockClear()
})

test.each([
  ['1-100-A-T', 80, 120],
  ['1-10-A-T', 1, 30],
])('loads coverage for %s only after a button click', (variantId, start, stop) => {
  let tree
  act(() => {
    tree = renderer.create(
      <BrowserRouter>
        <VariantNotFound datasetId="gnomad_r4" variantId={variantId} />
      </BrowserRouter>
    )
  })

  expect(Query).not.toHaveBeenCalled()
  expect(JSON.stringify(tree.toJSON())).toContain('Variant not found')
  expect(tree.root.findByType(Link).props.to).toBe(
    `/region/1-${Number(variantId.split('-')[1]) - 20}-${stop}`
  )

  const button = tree.root.findByType(Button)
  expect(button.props.children).toBe('Load coverage of surrounding region')

  act(() => {
    button.props.onClick()
  })

  expect(Query).toHaveBeenCalledTimes(1)
  expect(Query.mock.calls[0][0]).toMatchObject({
    operationName: 'RegionCoverage',
    variables: {
      chrom: '1',
      start,
      stop,
      datasetId: 'gnomad_r4',
      referenceGenome: 'GRCh38',
      includeExomeCoverage: true,
      includeGenomeCoverage: true,
    },
  })
  expect(tree.root.findAllByType(Button)).toHaveLength(0)

  act(() => {
    tree.unmount()
  })
})
