import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { describe, expect, test, jest } from '@jest/globals'
import MethylationEvidenceCard from './MethylationEvidenceCard'
import MethylationViewControls from './MethylationViewControls'
import { buildMethylationVisualGroups } from './methylationVisualGroups'
import type { MethylationSummaryPoint } from './methylationTypes'

const renderedText = (node: any): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return node?.children ? renderedText(node.children) : ''
}

const sites: MethylationSummaryPoint[] = [
  {
    chrom: 'chr22',
    pos1: 100,
    pos2: 101,
    mean_methylation: 60,
    mean_coverage: 24,
    num_samples: 286,
    std_methylation: 5,
    min_methylation: 50,
    max_methylation: 70,
  },
  {
    chrom: 'chr22',
    pos1: 150,
    pos2: 151,
    mean_methylation: 65,
    mean_coverage: 3,
    num_samples: 8,
    std_methylation: 7,
    min_methylation: 45,
    max_methylation: 75,
  },
]

describe('Methylation context components', () => {
  test('offers accessible Sites, Groups, and Both controls without fetching', () => {
    const onChange = jest.fn()
    const tree = renderer.create(<MethylationViewControls value="sites" onChange={onChange} />)
    const radios = tree.root.findAllByType('input')
    expect(radios.map((radio) => radio.props.value)).toEqual(['sites', 'groups', 'both'])
    expect(radios[0].props.checked).toBe(true)
    act(() => radios[2].props.onChange())
    expect(onChange).toHaveBeenCalledWith('both')
  })

  test('shows group evidence, conservative interpretation, and constituent sites', () => {
    const group = buildMethylationVisualGroups(sites)[0]
    const onViewModeChange = jest.fn()
    const onClose = jest.fn()
    const tree = renderer.create(
      <MethylationEvidenceCard
        selection={{ kind: 'group', group }}
        viewMode="groups"
        onViewModeChange={onViewModeChange}
        onClose={onClose}
      />
    )
    let text = renderedText(tree.toJSON())
    expect(text).toContain('visual CpG group · 2 CpGs')
    expect(text).toContain('Limited-support sites1/2')
    expect(text).toContain(
      'does not establish functional effect, imprinting, pathogenicity, or diagnosis'
    )
    expect(text).not.toMatch(/maternal|paternal/i)

    const showButton = tree.root
      .findAllByType('button')
      .find((button) => renderedText(button.props.children).includes('Show constituent'))!
    act(() => showButton.props.onClick())
    text = renderedText(tree.toJSON())
    expect(text).toContain('Constituent CpG-site evidence')
    expect(text).toContain('chr22:100')

    const switchButton = tree.root
      .findAllByType('button')
      .find((button) => renderedText(button.props.children).includes('Switch to CpG sites'))!
    act(() => switchButton.props.onClick())
    expect(onViewModeChange).toHaveBeenCalledWith('sites')

    const closeButton = tree.root
      .findAllByType('button')
      .find((button) => button.props['aria-label'] === 'Close methylation evidence')!
    act(() => closeButton.props.onClick())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
