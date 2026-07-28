import { getGenealogyPanelLayout } from './genealogyPanelLayout'

describe('getGenealogyPanelLayout', () => {
  test('expands the plot into the reserved right panel when genealogy is disabled', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 770,
      contextRightPanelWidth: 80,
      showGenealogyPanel: false,
    })).toEqual({
      plotWidth: 835,
      plotLeft: 150,
      plotRight: 985,
      rightPanelWidth: 0,
      totalWidth: 985,
    })
  })

  test('expands the plot when genealogy was requested but cannot be rendered', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 600,
      contextRightPanelWidth: 250,
      showGenealogyPanel: false,
    })).toEqual({
      plotWidth: 835,
      plotLeft: 150,
      plotRight: 985,
      rightPanelWidth: 0,
      totalWidth: 985,
    })
  })

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

  test.each([false, true])(
    'maps summary bands and haplotype rows to the same genomic pixel boundaries (genealogy=%s)',
    showGenealogyPanel => {
      const regionViewerPanels = {
        leftPanelWidth: 132,
        centerPanelWidth: 1091,
        contextRightPanelWidth: 260,
        showGenealogyPanel,
      }

      // Both stacked track families consume this layout. These assertions guard the
      // genomic viewport itself rather than the unrelated outer canvas width.
      const summaryLayout = getGenealogyPanelLayout(regionViewerPanels)
      const haplotypeLayout = getGenealogyPanelLayout(regionViewerPanels)

      expect([summaryLayout.plotLeft, summaryLayout.plotRight]).toEqual([
        haplotypeLayout.plotLeft,
        haplotypeLayout.plotRight,
      ])
      expect(summaryLayout.plotLeft).toBe(132)
      expect(summaryLayout.plotRight).toBe(showGenealogyPanel ? 1223 : 1468)
    }
  )
})
