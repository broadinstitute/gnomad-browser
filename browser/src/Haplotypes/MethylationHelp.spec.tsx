import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'

import MethylationHelp, {
  PerCopyMethylationHelp,
  type MethylationSampleAvailability,
} from './MethylationHelp'

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

  test('keeps sample totals separate and explains the confirmed per-copy mapping', () => {
    const sampleTotalText = renderedText(renderer.create(<MethylationHelp />).toJSON())
    const perCopyText = renderedText(
      renderer
        .create(
          <PerCopyMethylationHelp
            capability={{
              available: true,
              joinable_to_vcf: true,
              status: 'AVAILABLE_CONFIRMED',
              identity: null,
              source_sample_ids: [],
              max_span_bp: 100000,
              max_samples: 25,
              max_records: 250000,
              reason: 'Confirmed for the pinned browser bundle',
            }}
          />
        )
        .toJSON()
    )

    expect(sampleTotalText).toContain('Sample total:')
    expect(sampleTotalText).toContain('not allele-specific')
    expect(perCopyText).toContain('Copy A is not necessarily VCF GT strand 1')
    expect(perCopyText).toContain('source HAP1 maps to VCF GT strand 1')
    expect(perCopyText).toContain('source HAP2 maps to VCF GT strand 2')
    expect(perCopyText).toContain('maps GT1/GT2 to canonical copy A/B')
    expect(perCopyText).toContain('no maternal or paternal meaning')
    expect(perCopyText).toContain('AVAILABLE_CONFIRMED')
  })

  test('shows source context in help when provided', () => {
    const text = renderedText(
      renderer.create(<MethylationHelp sourceLabel="Optional Y1 CpG ancillary data" />).toJSON()
    )

    expect(text).toContain('Source: Optional Y1 CpG ancillary data')
  })

  test('distinguishes loading metadata from releases without availability metadata', () => {
    const loading = renderedText(renderer.create(<MethylationHelp availability={null} />).toJSON())
    const generic = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(loading).toContain('Availability details are loading')
    expect(generic).not.toContain('Sample availability')
  })
})
