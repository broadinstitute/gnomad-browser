import { getGenealogyPanelLayout } from './genealogyPanelLayout'

describe('getGenealogyPanelLayout', () => {
  test('expands the plot into the reserved right panel when genealogy is disabled', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 770,
      contextRightPanelWidth: 80,
      showGenealogyPanel: false,
    })).toEqual({
      plotWidth: 850,
      rightPanelWidth: 0,
      totalWidth: 1000,
    })
  })

  test('expands the plot when genealogy was requested but cannot be rendered', () => {
    expect(getGenealogyPanelLayout({
      leftPanelWidth: 150,
      centerPanelWidth: 600,
      contextRightPanelWidth: 250,
      showGenealogyPanel: false,
    })).toEqual({
      plotWidth: 850,
      rightPanelWidth: 0,
      totalWidth: 1000,
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
      rightPanelWidth: 250,
      totalWidth: 1000,
    })
  })
})
