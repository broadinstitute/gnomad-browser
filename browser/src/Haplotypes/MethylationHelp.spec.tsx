import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'

import MethylationHelp, { type MethylationSampleAvailability } from './MethylationHelp'

const availability: MethylationSampleAvailability[] = [
  {
    sample_id: 'available-sample',
    available: true,
    status: 'AVAILABLE_COMPLETE',
    reason: null,
  },
  {
    sample_id: 'missing-assay',
    available: false,
    status: 'UNAVAILABLE_NO_ASSAY_SOURCE',
    reason: 'No methylation assay source',
  },
  {
    sample_id: 'incomplete-sample',
    available: false,
    status: 'UNAVAILABLE_INCOMPLETE',
    reason: null,
  },
]

const renderedText = (node: any): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return node?.children ? renderedText(node.children) : ''
}

describe('MethylationHelp', () => {
  test('shows concise availability and unavailable-sample reasons', () => {
    const tree = renderer.create(<MethylationHelp availability={availability} />)
    const text = renderedText(tree.toJSON())

    expect(text).toContain('1 of 3 canonical samples have methylation data')
    expect(text).toContain('remaining 2 samples are excluded from methylation requests')
    expect(text).toContain('Unavailable samples (2) and reasons')
    expect(text).toContain('missing-assay')
    expect(text).toContain('No methylation assay source')
    expect(text).toContain('incomplete-sample')
    expect(text).toContain('No reason supplied')
  })

  test('distinguishes loading metadata from releases without availability metadata', () => {
    const loading = renderedText(renderer.create(<MethylationHelp availability={null} />).toJSON())
    const generic = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(loading).toContain('Availability details are loading')
    expect(generic).not.toContain('Sample availability')
  })
})
