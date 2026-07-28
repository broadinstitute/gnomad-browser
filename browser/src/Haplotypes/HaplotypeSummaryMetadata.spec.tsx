import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, jest, test } from '@jest/globals'
import {
  HaplotypeInfoBar,
  HaplotypeOmissionHelp,
  Legend,
  RecombinationHelp,
  type HaplotypeGroup,
} from './index'

jest.mock('./DeckGLLollipopTrack', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('./ChromosomePainterTrack', () => ({
  __esModule: true,
  default: () => null,
}))

const renderedText = (node: any): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return node?.children ? renderedText(node.children) : ''
}

const group: HaplotypeGroup = {
  samples: [{ sample_id: 'sample-1', variant_sets: [] }],
  variants: {
    readable_id: 'group-1',
    variants: [{ variant_id: 'v1' } as any],
  },
  below_threshold: { readable_id: 'below-1', variants: [] },
  start: 100,
  stop: 1100,
  hash: 1,
}

describe('haplotype summary metadata', () => {
  test('shows the compact unphased count inline', () => {
    const text = renderedText(
      renderer
        .create(
          <HaplotypeInfoBar
            displayGroups={[group]}
            start={100}
            stop={1100}
            threshold={0.01}
            groupingMode="similarity"
            clusterCount={1}
            clusterThreshold={0.25}
            haplotypeLoading={false}
            workerComputing={false}
            loadingStatus=""
            methylationLoading={false}
            methylationSampleCount={0}
            methylationTotalSamples={0}
            isAutoTuned={false}
            plotType="lollipop"
            ambiguousUnphasedRows={1234}
          />
        )
        .toJSON()
    )

    expect(text).toContain('Unphased: 1,234')
    expect(text).not.toContain('unphased carrier rows are excluded')
    expect(text).not.toContain('biological strand')
  })

  test('explains the scope of omitted records without removing summary data', () => {
    const text = renderedText(renderer.create(<HaplotypeOmissionHelp />).toJSON())

    expect(text).toContain('per-sample variant carrier records omitted only from')
    expect(text).toContain('Haplotype View')
    expect(text).toContain('haplotype 1 or 2')
    expect(text).toContain('variants and their frequencies remain available in Summary View')
    expect(text).not.toContain('biological strand')
  })

  test('keeps data-layer labels compact and places source context in help', () => {
    const source = 'Pinned CpG mixed-provenance prototype data'
    const legendText = renderedText(
      renderer
        .create(
          <Legend methylationLabel={source} recombinationLabel="External reference (UCSC hg38)" />
        )
        .toJSON()
    )
    const recombinationHelp = renderedText(
      renderer.create(<RecombinationHelp sourceLabel="External reference (UCSC hg38)" />).toJSON()
    )

    expect(legendText).toContain('Methylation')
    expect(legendText).toContain('Recombination rate')
    expect(legendText).not.toContain(source)
    expect(legendText).not.toContain('External reference')
    expect(recombinationHelp).toContain('Source: External reference (UCSC hg38)')
  })
})
