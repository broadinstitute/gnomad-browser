import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { describe, expect, jest, test } from '@jest/globals'
import HaplotypeTrack, {
  HaplotypeInfoBar,
  HaplotypeOmissionHelp,
  Legend,
  RecombinationHelp,
  type HaplotypeGroup,
} from './index'

jest.mock('./DeckGLLollipopTrack', () => ({
  __esModule: true,
  default: jest
    .requireActual<typeof import('react')>('react')
    .forwardRef(() => 'Lollipop renderer'),
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
  samples: [{ sample_id: 'sample-1', vcf_strand: 1, phase_set: null, variant_sets: [] }],
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

  test('only exposes lollipop controls and omits compound-het sorting', () => {
    const diploidText = renderedText(
      renderer.create(<Legend groupingMode="diploid" initialSortBy="sample_id" />).toJSON()
    )
    const haploidText = renderedText(renderer.create(<Legend />).toJSON())

    expect(diploidText).toContain('Clustering')
    expect(diploidText).toContain('Data Layers')
    expect(diploidText).toContain('Sample')
    expect(diploidText).toContain('ROH')
    expect(diploidText).not.toContain('Display')
    expect(diploidText).not.toContain('Plot:')
    expect(diploidText).not.toContain('Comp. Het.')
    expect(haploidText).toContain('Similarity')
    expect(haploidText).toContain('Count')
  })

  test('ignores a legacy alternate plot prop and renders lollipop', () => {
    const text = renderedText(
      renderer
        .create(
          React.createElement(HaplotypeTrack as any, {
            haplotypeGroups: [group],
            methylationData: [],
            start: 100,
            stop: 1100,
            plotType: 'bubble',
          })
        )
        .toJSON()
    )

    expect(text).toContain('Lollipop renderer')
    expect(text).toContain('lollipop')
    expect(text).not.toContain('bubble')
  })

  test('hides sample totals and fails the per-copy control closed with a typed reason', () => {
    const component = renderer.create(
      <Legend
        joinedMethylationCapability={{
          available: false,
          joinable_to_vcf: false,
          status: 'UNAVAILABLE_AOU_SUMMARY_ONLY',
          identity: null,
          source_sample_ids: [],
          max_span_bp: 100000,
          max_samples: 25,
          max_records: 250000,
          reason: 'AoU is summary-only',
        }}
        groupingMode="diploid"
      />
    )
    const text = renderedText(component.toJSON())
    const disabledCheckboxes = component.root.findAll(
      (node) =>
        node.type === 'input' && node.props.type === 'checkbox' && node.props.disabled === true
    )

    expect(text).not.toContain('Methylation (sample total)')
    expect(text).not.toContain('Outliers only')
    expect(text).not.toContain('Load all sample totals')
    expect(text).toContain('Per-copy methylation')
    expect(disabledCheckboxes).toHaveLength(1)
    expect(disabledCheckboxes[0].parent?.props.title).toBe('AoU is summary-only')
  })

  test('integrates the real Legend methylation loading, error, retry, and roster filter controls', () => {
    const retry = jest.fn()
    const filter = jest.fn()
    const loadingProgress = {
      status: 'loading' as const,
      terminalCount: 1,
      totalCount: 3,
      errorCodes: [],
    }
    const component = renderer.create(
      <Legend
        groupingMode="diploid"
        showPerCopyMethylation
        joinedMethylationUsableForRegion
        methylationSamplesOnly={false}
        onMethylationSamplesOnlyChange={filter}
        visibleMethylationProgress={loadingProgress}
        onRetryPerCopyMethylation={retry}
      />
    )

    let text = renderedText(component.toJSON())
    expect(text).toContain('Loading methylation 1/3 visible samples…')
    expect(text).toContain('Methylation samples only')
    expect(text).not.toContain('Methylation (sample total)')
    expect(text).not.toContain('Outliers only')
    expect(text).not.toContain('Load all sample totals')

    const uncheckedControls = component.root.findAll(
      (node) => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked === false
    )
    act(() => uncheckedControls[0].props.onChange({ target: { checked: true } }))
    expect(filter).toHaveBeenCalledWith(true)

    act(() => component.update(
      <Legend
        groupingMode="diploid"
        showPerCopyMethylation
        joinedMethylationUsableForRegion
        methylationSamplesOnly
        onMethylationSamplesOnlyChange={filter}
        visibleMethylationProgress={{
          status: 'error',
          terminalCount: 1,
          totalCount: 3,
          errorCodes: ['TYPED_FAILURE'],
        }}
        onRetryPerCopyMethylation={retry}
      />
    ))
    text = renderedText(component.toJSON())
    expect(text).toContain('Methylation loading error for visible samples (TYPED_FAILURE)')
    expect(text).toContain('Retry methylation')
    const retryButton = component.root.find(
      (node) => node.type === 'button' && renderedText(node) === 'Retry methylation'
    )
    act(() => retryButton.props.onClick())
    expect(retry).toHaveBeenCalledTimes(1)
  })

  test('keeps data-layer labels compact and places source context in help', () => {
    const source = 'Optional Y1 CpG ancillary data'
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

    expect(legendText).toContain('Per-copy methylation')
    expect(legendText).toContain('Recombination rate')
    expect(legendText).not.toContain(source)
    expect(legendText).not.toContain('External reference')
    expect(recombinationHelp).toContain('Source: External reference (UCSC hg38)')
  })
})
