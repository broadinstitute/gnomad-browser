export const GENEALOGY_PANEL_WIDTH = 180

type GenealogyPanelLayoutOptions = {
  leftPanelWidth: number
  centerPanelWidth: number
  contextRightPanelWidth: number
  showGenealogyPanel: boolean
  preferredGenealogyPanelWidth?: number
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
}: GenealogyPanelLayoutOptions) => {
  const availableWidth = Math.max(0, centerPanelWidth + contextRightPanelWidth)
  const rightPanelWidth = showGenealogyPanel
    ? Math.min(availableWidth, Math.max(preferredGenealogyPanelWidth, contextRightPanelWidth))
    : 0
  // RegionViewer's center panel is the shared genomic content boundary. Its right
  // panel is either genealogy space or the measured native scrollbar gutter; neither
  // belongs to the genomic scale.
  const plotWidth = Math.max(0, availableWidth - rightPanelWidth - (showGenealogyPanel ? 0 : contextRightPanelWidth))

  return {
    plotWidth,
    plotLeft: leftPanelWidth,
    plotRight: leftPanelWidth + plotWidth,
    rightPanelWidth,
    totalWidth: leftPanelWidth + availableWidth,
  }
}
