export const GENEALOGY_PANEL_WIDTH = 180
export const HAPLOTYPE_SCROLLBAR_GUTTER_WIDTH = 15

type GenealogyPanelLayoutOptions = {
  leftPanelWidth: number
  centerPanelWidth: number
  contextRightPanelWidth: number
  showGenealogyPanel: boolean
  preferredGenealogyPanelWidth?: number
  scrollbarGutterWidth?: number
}

/**
 * Assign all width available to a track between its plot and optional genealogy panel.
 * RegionViewer reserves a right panel for aligned tracks; when no genealogy is rendered,
 * the plot absorbs that space instead of leaving it blank.
 */
export const getGenealogyPanelLayout = ({
  leftPanelWidth,
  centerPanelWidth,
  contextRightPanelWidth,
  showGenealogyPanel,
  preferredGenealogyPanelWidth = GENEALOGY_PANEL_WIDTH,
  scrollbarGutterWidth = HAPLOTYPE_SCROLLBAR_GUTTER_WIDTH,
}: GenealogyPanelLayoutOptions) => {
  const availableWidth = Math.max(0, centerPanelWidth + contextRightPanelWidth)
  const rightPanelWidth = showGenealogyPanel
    ? Math.min(availableWidth, Math.max(preferredGenealogyPanelWidth, contextRightPanelWidth))
    : 0
  // The vertically scrolling haplotype viewport loses this width to its native
  // scrollbar. Keep genomic data out of that gutter so non-scrolling SVG tracks
  // terminate at the same visible pixel.
  const plotWidth = Math.max(0, availableWidth - rightPanelWidth - (showGenealogyPanel ? 0 : scrollbarGutterWidth))

  return {
    plotWidth,
    plotLeft: leftPanelWidth,
    plotRight: leftPanelWidth + plotWidth,
    rightPanelWidth,
    totalWidth: leftPanelWidth + (showGenealogyPanel ? availableWidth : plotWidth),
  }
}
