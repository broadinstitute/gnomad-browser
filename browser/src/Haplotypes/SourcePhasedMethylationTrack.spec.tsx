import React from 'react'
import renderer from 'react-test-renderer'

jest.mock('@gnomad/region-viewer', () => {
  // eslint-disable-next-line global-require
  const mockReact = require('react')
  return {
    Track: ({ renderLeftPanel, children }: any) => mockReact.createElement(
      'div',
      null,
      renderLeftPanel(),
      children({ scalePosition: (position: number) => position - 47_040_000, width: 10_000 })
    ),
  }
})

// eslint-disable-next-line import/first
import SourcePhasedMethylationTrack from './SourcePhasedMethylationTrack'

describe('SourcePhasedMethylationTrack', () => {
  test('renders separate source labels aligned by genomic coordinate without VCF mapping', () => {
    const component = renderer.create(<SourcePhasedMethylationTrack records={[
      {
        chr: 'chr22', pos1: 47_040_001, pos2: 47_040_002, methylation: 25,
        sample: 'HG00097', coverage: 4, data_layer: 'SOURCE_PHASED',
        source_haplotype: 'HAP1', vcf_strand: null, phase_set: null,
      },
      {
        chr: 'chr22', pos1: 47_040_003, pos2: 47_040_004, methylation: 75,
        sample: 'HG00097', coverage: 8, data_layer: 'SOURCE_PHASED',
        source_haplotype: 'HAP2', vcf_strand: null, phase_set: null,
      },
    ]} />)
    const text = JSON.stringify(component.toJSON())
    expect(text).toContain('HG00097 source hap1')
    expect(text).toContain('HG00097 source hap2')
    expect(text).toContain('orientation unconfirmed')
    const circles = component.root.findAllByType('circle')
    expect(circles.map((circle) => circle.props.cx)).toEqual([1, 3])
  })
})
