import React from 'react'
import { test, describe, expect } from '@jest/globals'
import ClinvarAllVariantsPlot from './ClinvarAllVariantsPlot'
import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import transcriptFactory from '../__factories__/Transcript'
import { render } from '@testing-library/react'
import { Strand } from '../GenePage/GenePage'

const extractPlotFragment = (tree: DocumentFragment) => tree.querySelector('svg >g:nth-child(2)')

type PlotLayoutElement =
  | ['overlay', number, number]
  | ['cds', number, number]
  | ['utr', number, number]
  | ['stop_marker', number]

const plotLayoutMatches = (expected: PlotLayoutElement[], plotBody: Element | null) => {
  if (plotBody === null) {
    throw new Error('plot body missing')
  }

  const children = Array.from(plotBody.querySelector('g')!.querySelectorAll('*').values())
  expected.forEach((expectedElement, i) => {
    if (i >= children.length) {
      throw new Error(`ran out of children while looking for ${expectedElement}`)
    }

    const child = children[i]
    const elementType = expectedElement[0]
    const expectedTag = {
      overlay: 'rect',
      cds: 'line',
      utr: 'line',
      stop_marker: 'path',
    }[elementType]

    if (child.tagName !== expectedTag) {
      throw new Error(
        `expected tag "${expectedTag}" for element ${expectedElement} but got "${child.tagName}"`
      )
    }

    if (elementType === 'overlay') {
      const [, start, width] = expectedElement
      const actualStart = child.getAttribute('x')
      if (actualStart !== start.toString()) {
        throw new Error(`wrong start (${actualStart}) for ${expectedElement}`)
      }

      const actualWidth = child.getAttribute('width')
      if (actualWidth !== width.toString()) {
        throw new Error(`wrong width (${actualWidth}) for ${expectedElement}`)
      }
    }

    if (elementType === 'cds' || elementType === 'utr') {
      const [_, start, stop] = expectedElement

      const actualStart = child.getAttribute('x1')
      if (actualStart !== start.toString()) {
        throw new Error(`wrong start (${actualStart}) for ${expectedElement}`)
      }

      const actualStop = child.getAttribute('x2')
      if (actualStop !== stop.toString()) {
        throw new Error(`wrong stop (${actualStop}) for ${expectedElement}`)
      }
    }

    if (elementType === 'cds') {
      const actualDashArray = child.getAttribute('stroke-dasharray')
      if (actualDashArray !== null) {
        throw new Error(`got dashed line where solid expected for ${expectedElement}`)
      }
    }

    if (elementType === 'utr') {
      const actualDashArray = child.getAttribute('stroke-dasharray')
      if (actualDashArray !== '2 5') {
        throw new Error(`got solid line where dashed expected for ${expectedElement}`)
      }
    }

    if (elementType === 'stop_marker') {
      const [_, position] = expectedElement
      const actualTransform = child.getAttribute('transform') || ''
      if (!actualTransform.includes(`translate(${position}`)) {
        throw new Error(`wrong transform (${actualTransform}) for ${expectedElement}`)
      }
    }
  })
}

describe('ClinvarAllVariantsPlot', () => {
  describe.each(['+', '-'] as Strand[])('rendering a frameshift on strand %s', (strand) => {
    const baseVariant = clinvarVariantFactory.build({
      major_consequence: 'frameshift_variant',
      pos: 23,
    })

    const transcript = transcriptFactory.build({
      transcript_id: baseVariant.transcript_id,
      strand,
      exons: [
        {
          feature_type: 'UTR',
          start: 123,
          stop: 222,
        },
        {
          feature_type: 'CDS',
          start: 223,
          stop: 322,
        },
        {
          feature_type: 'CDS',
          start: 423,
          stop: 522,
        },
        {
          feature_type: 'CDS',
          start: 623,
          stop: 722,
        },
        {
          feature_type: 'UTR',
          start: 723,
          stop: 822,
        },
      ],
    })

    const scalePosition = (...args: any[]) => args
    const onClickVariant = (...args: any[]) => args
    const width = 1200

    test('renders properly when the variant ends in the coding section', () => {
      // The HGVSP below specifies a frameshift 50 codons long, starting with
      // codon 30.
      //
      // Hence, counting bases 1-based as usual, the variation begins with the
      // first base of codon 30, located at 30 * 3 - 2 = 88 bases into the
      // coding section.
      //
      // Considering codon 30 as the first codon, the end of the variation
      // will be the last base of the 50th codon, located at
      // (30 + 50 - 1) * 3 = 237 bases into the coding section.
      //
      // Each of the exons we defined above is 100 bases long, so for a
      // + strand variant, we want the plot to render:
      //   * part of first CDS, from base (223 + 88 - 1) = 310 to its end
      //   at 322 (13 bases)
      //   * all of the second CDS, from 423 to 522 (100 bases)
      //   * part of third CDS, from its start at 623 to base
      //   (623 + 150 - 13 - 100 - 1) = 659 (37 bases)
      //
      // In addition, we also want to render the two intervening introns, and
      // an "X" marking the 3' end (to the right as we plot it).
      //
      // By the converse of that logic, on the - strand, we expect the plot
      // to render:
      //   * part of (gene-wise) first CDS, from base
      //   (722 - 88 + 1) = 635 down to its end at 623 (13 bases)
      //   * all of the (gene-wise) second CDS, from base 522 down to 423
      //   (100 bases)
      //   * all of the (gene-wise) third CDS, from base 322 down to base
      //   (322 - 150 + 13 + 100 + 1) = 286 (37 bases)
      //
      //  ...and again, two intervening introns and an "X" at the 3' end (left
      //  as we plot it).

      const variant = { ...baseVariant, hgvsp: 'p.Tyr30SerfsTer50' }
      const tree = render(
        <ClinvarAllVariantsPlot
          scalePosition={scalePosition}
          transcripts={[transcript]}
          variants={[variant]}
          width={width}
          onClickVariant={onClickVariant}
        />
      ).asFragment()
      const plotBody = extractPlotFragment(tree)

      const plotLayouts: Record<Strand, PlotLayoutElement[]> = {
        '+': [
          ['overlay', 310, 659 - 310],
          ['cds', 310, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 659],
          ['stop_marker', 659],
        ],
        '-': [
          ['overlay', 286, 635 - 286],
          ['cds', 286, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 635],
          ['stop_marker', 286],
        ],
      }
      const expectedPlotLayout = plotLayouts[strand]

      expect(() => plotLayoutMatches(expectedPlotLayout, plotBody)).not.toThrowError()
      expect(tree).toMatchSnapshot()
    })

    test('renders properly when the variant ends in the downstream UTR', () => {
      // Same logic as in the test above, but now our variants are 30 codons longer, so the far end of the variant should be 27 bases into the 3' UTR
      const variant = { ...baseVariant, hgvsp: 'p.Tyr30SerfsTer80' }
      const tree = render(
        <ClinvarAllVariantsPlot
          scalePosition={scalePosition}
          transcripts={[transcript]}
          variants={[variant]}
          width={width}
          onClickVariant={onClickVariant}
        />
      ).asFragment()
      const plotBody = extractPlotFragment(tree)

      const plotLayouts: Record<Strand, PlotLayoutElement[]> = {
        '+': [
          ['overlay', 310, 749 - 310],
          ['cds', 310, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 722],
          ['utr', 723, 749],
          ['stop_marker', 749],
        ],
        '-': [
          ['overlay', 196, 635 - 196],
          ['utr', 196, 222],
          ['cds', 223, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 635],
          ['stop_marker', 196],
        ],
      }
      const expectedPlotLayout = plotLayouts[strand]

      expect(() => plotLayoutMatches(expectedPlotLayout, plotBody)).not.toThrowError()
      expect(tree).toMatchSnapshot()
    })

    test('renders clamped to the end of the downstream UTR when the variant overruns the downstream UTR', () => {
      // Same logic as in the first test, but now our variants are 60 codons longer, so the far end of the variant should be at the end of the downstream UTR
      const variant = { ...baseVariant, hgvsp: 'p.Tyr30SerfsTer110' }
      const tree = render(
        <ClinvarAllVariantsPlot
          scalePosition={scalePosition}
          transcripts={[transcript]}
          variants={[variant]}
          width={width}
          onClickVariant={onClickVariant}
        />
      ).asFragment()
      const plotBody = extractPlotFragment(tree)

      const plotLayouts: Record<Strand, PlotLayoutElement[]> = {
        '+': [
          ['overlay', 310, 822 - 310],
          ['cds', 310, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 722],
          ['utr', 723, 822],
          ['stop_marker', 822],
        ],
        '-': [
          ['overlay', 123, 635 - 123],
          ['utr', 123, 222],
          ['cds', 223, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 635],
          ['stop_marker', 123],
        ],
      }
      const expectedPlotLayout = plotLayouts[strand]

      expect(() => plotLayoutMatches(expectedPlotLayout, plotBody)).not.toThrowError()
      expect(tree).toMatchSnapshot()
    })

    test('clamps end to end of the downstream UTR when the end in the HGVSP is "?"', () => {
      const variant = { ...baseVariant, hgvsp: 'p.Tyr30SerfsTer?' }
      const tree = render(
        <ClinvarAllVariantsPlot
          scalePosition={scalePosition}
          transcripts={[transcript]}
          variants={[variant]}
          width={width}
          onClickVariant={onClickVariant}
        />
      ).asFragment()
      const plotBody = extractPlotFragment(tree)

      const plotLayouts: Record<Strand, PlotLayoutElement[]> = {
        '+': [
          ['overlay', 310, 822 - 310],
          ['cds', 310, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 722],
          ['utr', 723, 822],
          ['stop_marker', 822],
        ],
        '-': [
          ['overlay', 123, 635 - 123],
          ['utr', 123, 222],
          ['cds', 223, 322],
          ['utr', 322, 423],
          ['cds', 423, 522],
          ['utr', 522, 623],
          ['cds', 623, 635],
          ['stop_marker', 123],
        ],
      }
      const expectedPlotLayout = plotLayouts[strand]

      expect(() => plotLayoutMatches(expectedPlotLayout, plotBody)).not.toThrowError()
      expect(tree).toMatchSnapshot()
    })
  })
})
