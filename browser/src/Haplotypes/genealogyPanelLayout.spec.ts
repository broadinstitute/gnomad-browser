import { getGenealogyPanelLayout } from './genealogyPanelLayout'

describe('getGenealogyPanelLayout', () => {
  test.each([0, 12, 15, 17])(
    'expands a no-tree plot through all non-scrollbar space (gutter=%ipx)',
    scrollbarGutter => {
      expect(getGenealogyPanelLayout({
        leftPanelWidth: 150,
        centerPanelWidth: 850 - scrollbarGutter,
        contextRightPanelWidth: scrollbarGutter,
        showGenealogyPanel: false,
      })).toEqual({
        plotWidth: 850 - scrollbarGutter,
        plotLeft: 150,
        plotRight: 1000 - scrollbarGutter,
        rightPanelWidth: 0,
        totalWidth: 1000,
      })
    }
  )

  test('allocates a right panel only when the genealogy tree is rendered', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 770,
      contextRightPanelWidth: 80,
      showGenealogyPanel: true,
    })).toEqual({
      plotWidth: 670,
      plotLeft: 150,
      plotRight: 820,
      rightPanelWidth: 180,
      totalWidth: 1000,
    })
  })

  test('keeps genealogy content out from under the native scrollbar', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 770,
      contextRightPanelWidth: 80,
      showGenealogyPanel: true,
      scrollbarGutterWidth: 15,
    })).toEqual({
      plotWidth: 655,
      plotLeft: 150,
      plotRight: 805,
      rightPanelWidth: 180,
      totalWidth: 985,
    })
  })

  test('uses a wider RegionViewer right panel without leaving unused space', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 600,
      contextRightPanelWidth: 250,
      showGenealogyPanel: true,
    })).toEqual({
      plotWidth: 600,
      plotLeft: 150,
      plotRight: 750,
      rightPanelWidth: 250,
      totalWidth: 1000,
    })
  })

  test.each([
    { width: 900, left: 115, gutter: 12 },
    { width: 1200, left: 132, gutter: 15 },
    { width: 1537, left: 150, gutter: 17 },
  ])(
    'maps summary and haplotype genomic boundaries at responsive width $width and gutter $gutter',
    ({ width, left, gutter }) => {
      const panels = {
        leftPanelWidth: left,
        centerPanelWidth: width - left - gutter,
        contextRightPanelWidth: gutter,
        showGenealogyPanel: false,
      }
      const summaryLayout = getGenealogyPanelLayout(panels)
      const haplotypeLayout = getGenealogyPanelLayout(panels)

      expect([summaryLayout.plotLeft, summaryLayout.plotRight]).toEqual([
        haplotypeLayout.plotLeft,
        haplotypeLayout.plotRight,
      ])
      expect(summaryLayout.plotRight).toBe(width - gutter)
    }
  )
})
