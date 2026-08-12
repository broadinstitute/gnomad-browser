import React from 'react'
import renderer, { act } from 'react-test-renderer'
import { describe, expect, jest, test } from '@jest/globals'
import MethylationSummaryTrack from './MethylationSummaryTrack'
import type { MethylationSummaryPoint } from './methylationTypes'

jest.mock('@gnomad/region-viewer', () => ({
  Track: ({ children, renderLeftPanel }: any) => (
    <div>
      {renderLeftPanel?.()}
      {children({ scalePosition: (position: number) => position, width: 500 })}
    </div>
  ),
}))

jest.mock('@gnomad/ui', () => ({
  TooltipAnchor: ({ children }: any) => <>{children}</>,
}))

const summary = (offset = 0): MethylationSummaryPoint[] => [
  {
    chrom: 'chr22',
    pos1: 100 + offset,
    pos2: 101 + offset,
    mean_methylation: 50,
    mean_coverage: 20,
    num_samples: 100,
    std_methylation: null,
  },
  {
    chrom: 'chr22',
    pos1: 200 + offset,
    pos2: 201 + offset,
    mean_methylation: 60,
    mean_coverage: 20,
    num_samples: 100,
    std_methylation: 5,
  },
]

const interactiveMarks = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => node.type === 'g' && node.props.role === 'button')

const renderedText = (node: any): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return node?.children ? renderedText(node.children) : ''
}

describe('MethylationSummaryTrack interaction', () => {
  test('uses bounded roving focus and supports arrow and keyboard selection', () => {
    window.sessionStorage.setItem('gnomad-lr-methylation-view', 'sites')
    const focus = jest.fn()
    const tree = renderer.create(<MethylationSummaryTrack methylationSummary={summary()} />)
    let marks = interactiveMarks(tree)
    expect(marks).toHaveLength(2)
    expect(marks.map((mark) => mark.props.tabIndex)).toEqual([0, -1])
    expect(marks[0].props['aria-label']).toContain('site SD unavailable')

    act(() =>
      marks[0].props.onKeyDown({
        key: 'ArrowRight',
        preventDefault: jest.fn(),
        currentTarget: {
          ownerSVGElement: {
            querySelector: () => ({ focus }),
          },
        },
      })
    )
    marks = interactiveMarks(tree)
    expect(marks.map((mark) => mark.props.tabIndex)).toEqual([-1, 0])
    expect(focus).toHaveBeenCalledTimes(1)

    act(() =>
      marks[1].props.onKeyDown({
        key: ' ',
        preventDefault: jest.fn(),
        currentTarget: {},
      })
    )
    expect(
      tree.root.findAll(
        (node) =>
          node.type === 'section' && node.props['aria-label'] === 'Methylation context evidence'
      )
    ).toHaveLength(1)
  })

  test('uses raw copy observations for the selected group and preserves its first site on switch', () => {
    window.sessionStorage.setItem('gnomad-lr-methylation-view', 'groups')
    const copyA = [
      { pos1: 100, pos2: 101, methylation: 100, coverage: 10, sample: 'high' },
      ...Array.from({ length: 10 }, (_, index) => ({
        pos1: 200,
        pos2: 201,
        methylation: 0,
        coverage: 10,
        sample: `low-${index}`,
      })),
    ]
    const tree = renderer.create(
      <MethylationSummaryTrack
        methylationSummary={summary()}
        copyMethylation={{ A: copyA, B: [] }}
        copyEvidenceAvailable
      />
    )
    act(() => interactiveMarks(tree)[0].props.onClick())
    expect(renderedText(tree.toJSON())).toContain('Loaded Copy A9.1% coverage-weighted mean')

    const switchButton = tree.root
      .findAllByType('button')
      .find((button) => renderedText(button.props.children).includes('Switch to CpG sites'))!
    act(() => switchButton.props.onClick())
    const text = renderedText(tree.toJSON())
    expect(text).toContain('View objectCpG site')
    expect(text).toContain('Regionchr22:100')
  })

  test('clears evidence selected in a prior summary scope', () => {
    window.sessionStorage.setItem('gnomad-lr-methylation-view', 'sites')
    const tree = renderer.create(<MethylationSummaryTrack methylationSummary={summary()} />)
    act(() => interactiveMarks(tree)[0].props.onClick())
    const evidenceCards = () =>
      tree.root.findAll(
        (node) =>
          node.type === 'section' && node.props['aria-label'] === 'Methylation context evidence'
      )
    expect(evidenceCards()).toHaveLength(1)

    act(() => tree.update(<MethylationSummaryTrack methylationSummary={summary(10_000)} />))
    expect(evidenceCards()).toHaveLength(0)
  })
})
