import React from 'react'

import RegionViewer from '../RegionViewer/RegionViewer'
import HaplotypeTrack, { type HaplotypeCluster, type HaplotypeGroup } from '../Haplotypes'
import type { AccordionCoordinateMapper } from '../Haplotypes/AccordionCoordinateMapper'
import type { LocalTargetTrackOverlay } from '../Haplotypes/DeckGLLollipopTrack'
import { LOCAL_TARGET_LABEL_PANEL_WIDTH } from '../Haplotypes/localTargetPresentation'
import AccordionRegionViewer from '../Haplotypes/AccordionRegionViewer'
import { AccordionPositionAxisTrack } from '../Haplotypes/AccordionPositionAxis'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

const LocalHaplotypeTrack = ({
  mapper,
  window,
  width,
  height,
  groups,
  clusters,
  treeJson,
  metadata,
  resolution,
  onResolutionChange,
  expandedClusterIds,
  onToggleClusterExpansion,
  targetOverlay,
}: {
  mapper: AccordionCoordinateMapper
  window: { chrom: string; start: number; stop: number }
  width: number
  height: number
  groups: HaplotypeGroup[]
  clusters: HaplotypeCluster[]
  treeJson?: string
  metadata: SampleMetadataMap
  resolution: number
  onResolutionChange: (resolution: number) => void
  expandedClusterIds: Set<string>
  onToggleClusterExpansion: (clusterId: string) => void
  targetOverlay: LocalTargetTrackOverlay
}) => (
  <RegionViewer
    leftPanelWidth={LOCAL_TARGET_LABEL_PANEL_WIDTH}
    rightPanelWidth={210}
    regions={[window as any]}
    width={width}
  >
    <AccordionRegionViewer mapper={mapper} originalRegion={window}>
      <HaplotypeTrack
        height={height}
        haplotypeGroups={groups}
        clusters={clusters}
        treeJson={treeJson}
        methylationData={[]}
        sampleMetadata={metadata}
        start={window.start}
        stop={window.stop}
        initialMinAf={0}
        initialSortBy="similarity_score"
        initialColorMode="sv_type"
        plotType="lollipop"
        showGenealogy
        groupingMode="similarity"
        clusterThreshold={resolution}
        onClusterThresholdChange={onResolutionChange}
        expandedClusterIds={expandedClusterIds}
        toggleClusterExpansion={onToggleClusterExpansion}
        showPhantomRegions
        regionSize={window.stop - window.start}
        anonymizeSampleIdentifiers
        localTargetOverlay={targetOverlay}
      />
      <AccordionPositionAxisTrack />
    </AccordionRegionViewer>
  </RegionViewer>
)

export default LocalHaplotypeTrack
