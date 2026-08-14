import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeTrack, { Legend } from './index'
import { areExperimentalFeaturesEnabled } from '../experimentalFeatures'

jest.mock('./DeckGLLollipopTrack', () => ({
  __esModule: true,
  default: jest.requireActual<typeof import('react')>('react').forwardRef(() => (
    <div aria-label="lollipop renderer" />
  )),
}))
jest.mock('./ChromosomePainterTrack', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('./BubbleTrack', () => ({
  __esModule: true,
  default: () => <div aria-label="variation graph renderer" />,
}))

const flagName = '__EXPERIMENTAL_FEATURES_ENABLED__'
const originalFlag = (globalThis as any)[flagName]

const restoreFlag = () => {
  if (originalFlag === undefined) {
    delete (globalThis as any)[flagName]
  } else {
    ;(globalThis as any)[flagName] = originalFlag
  }
}

afterEach(restoreFlag)

const renderLegend = (props: Record<string, unknown> = {}) => render(
  <Legend
    groupingMode="diploid"
    showPerCopyMethylation
    joinedMethylationUsableForRegion
    methylationAvailable
    {...props}
  />
)

const haplotypeGroup: any = {
  hash: 1,
  start: 100,
  stop: 200,
  samples: [{ sample_id: 'sample-1', vcf_strand: 1, phase_set: null, variant_sets: [] }],
  variants: {
    readable_id: 'group-1',
    variants: [{
      variant_id: '22-150-A-T', chrom: '22', pos: 150, ref: 'A', alt: 'T',
      allele_type: 'snv', allele_length: 0, populations: [],
      freq: { ac: 1, an: 2, af: 0.5 }, rsid: '',
    }],
  },
  below_threshold: { readable_id: '', variants: [] },
}

describe('experimental browser feature flag', () => {
  test('fails closed without a compiled constant and for non-boolean values', () => {
    delete (globalThis as any)[flagName]
    expect(() => areExperimentalFeaturesEnabled()).not.toThrow()
    expect(areExperimentalFeaturesEnabled()).toBe(false)

    ;(globalThis as any)[flagName] = 'true'
    expect(areExperimentalFeaturesEnabled()).toBe(false)
  })

  test('preserves the stable controls when disabled', () => {
    delete (globalThis as any)[flagName]
    renderLegend()

    expect(screen.getByRole('checkbox', { name: 'Methylation' })).not.toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Methylation context' })).toBeNull()
    expect(screen.queryByLabelText('Plot:')).toBeNull()
    expect(screen.queryByLabelText('Expand INS/TRs')).toBeNull()
    expect(screen.queryByText('Experimental')).toBeNull()
  })

  test('renders only the stable plot when disabled even if an alternate plot is requested', () => {
    delete (globalThis as any)[flagName]
    render(
      <HaplotypeTrack
        start={100}
        stop={200}
        haplotypeGroups={[haplotypeGroup]}
        methylationData={[]}
        plotType="bubble"
      />
    )

    expect(screen.getByLabelText('lollipop renderer')).not.toBeNull()
    expect(screen.queryByLabelText('variation graph renderer')).toBeNull()
  })

  test('allows an alternate haplotype renderer when enabled', () => {
    ;(globalThis as any)[flagName] = true
    render(
      <HaplotypeTrack
        start={100}
        stop={200}
        haplotypeGroups={[haplotypeGroup]}
        methylationData={[]}
        plotType="bubble"
      />
    )

    expect(screen.getByLabelText('variation graph renderer')).not.toBeNull()
    expect(screen.queryByLabelText('lollipop renderer')).toBeNull()
  })

  test('shows marked experimental controls and forwards their changes when enabled', () => {
    ;(globalThis as any)[flagName] = true
    const onPlotTypeChange = jest.fn()
    const onShowPhantomRegionsChange = jest.fn()
    const onShowMethylationChange = jest.fn()

    renderLegend({
      groupingMode: 'similarity',
      onPlotTypeChange,
      onShowPhantomRegionsChange,
      onShowMethylationChange,
    })

    expect(screen.getAllByText('Experimental')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'Variation Graph' })).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Plot:'), { target: { value: 'bubble' } })
    fireEvent.click(screen.getByLabelText('Expand INS/TRs'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Methylation context' }))

    expect(onPlotTypeChange).toHaveBeenCalledWith('bubble')
    expect(onShowPhantomRegionsChange).toHaveBeenCalledWith(true)
    expect(onShowMethylationChange).toHaveBeenCalledWith(true)
  })
})
