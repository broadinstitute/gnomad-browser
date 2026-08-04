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

    expect(text).toContain('1 of 3 canonical roster samples have sample-total methylation data')
    expect(text).toContain('remaining 2 samples are excluded from methylation requests')
    expect(text).toContain('Unavailable samples (2) and reasons')
    expect(text).toContain('missing-assay')
    expect(text).toContain('No methylation assay source')
    expect(text).toContain('incomplete-sample')
    expect(text).toContain('No reason supplied')
  })

  test('labels totals accurately and keeps phased joining unavailable', () => {
    const text = renderedText(renderer.create(
      <MethylationHelp phasedCapability={{
        data_layer: 'SOURCE_PHASED',
        available: false,
        joinable_to_vcf: false,
        status: 'UNAVAILABLE_ORIENTATION_UNCONFIRMED',
        orientation_status: 'UNCONFIRMED',
        phase_set_semantics: 'SOURCE_TRACK_HAS_NO_PHASE_SET',
        route_run_id: null,
        source_sample_ids: [],
        reason: 'Source orientation is not confirmed',
      }} />
    ).toJSON())

    expect(text).toContain('Sample total:')
    expect(text).toContain('not allele-specific')
    expect(text).toContain('UNAVAILABLE_ORIENTATION_UNCONFIRMED')
    expect(text).toContain('source labels remain distinct from VCF GT positions')
    expect(text).toContain('phase set is null')
    expect(text).not.toContain('identify allele-specific methylation')
  })

  test('shows source context in help when provided', () => {
    const text = renderedText(renderer.create(
      <MethylationHelp sourceLabel="Optional Y1 CpG ancillary data" />
    ).toJSON())

    expect(text).toContain('Source: Optional Y1 CpG ancillary data')
  })

  test('distinguishes loading metadata from releases without availability metadata', () => {
    const loading = renderedText(renderer.create(<MethylationHelp availability={null} />).toJSON())
    const generic = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(loading).toContain('Availability details are loading')
    expect(generic).not.toContain('Sample availability')
  })
})
