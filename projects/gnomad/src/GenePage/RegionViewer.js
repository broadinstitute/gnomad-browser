import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import RegionViewer from '@broad/region'
import NavigatorConnected from '@broad/gene-page/src/containers/NavigatorConnected'
import TranscriptTrack from '@broad/track-transcript'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
// import StackedBarTrack from '@broad/track-stacked-bar'
import { groupExonsByTranscript } from '@broad/utilities/src/transcriptTools'
import { exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'
import { geneData } from '@broad/gene-page/src/resources/genes'

import {
  finalFilteredVariants,
  selectedVariantDataset,
} from '@broad/gene-page/src/resources/variants'

import {
  coverageConfigClassic,
  coverageConfigNew,
  markerExacClassic,
  attributeConfig,
} from '@broad/gene-page/src/presentation/RegionViewerStyles'

const GeneRegion = ({
  gene,
  allVariants,
  selectedVariantDataset,
  exonPadding,
}) => {
  const geneJS = gene.toJS()
  const canonicalExons = geneJS.transcript.exons
  const { transcripts } = geneJS
  const transcriptsGrouped = transcripts.reduce((acc, transcript) => {
    return {
      ...acc,
      [transcript.transcript_id]: transcript,
    }
  }, {})
  const { exome_coverage, genome_coverage } = geneJS

  const variantsReversed = allVariants.reverse()

  const showVariants = true

  const coverageConfig = selectedVariantDataset === 'exacVariants' ?
    coverageConfigClassic(exome_coverage, genome_coverage) :
    coverageConfigNew(exome_coverage, genome_coverage)

  const maxTissue = transcripts.reduce((acc, transcript) => {
    let maxTissueForTranscript = [null, 0]
    Object.keys(transcript.gtex_tissue_tpms_by_transcript).forEach((tissue) => {
      if (transcript.gtex_tissue_tpms_by_transcript[tissue] > maxTissueForTranscript[1]) {
        maxTissueForTranscript = [tissue, transcript.gtex_tissue_tpms_by_transcript[tissue]]
      }
    })
    if (maxTissueForTranscript[1] > acc[1]) {
      return maxTissueForTranscript
    }
    return acc
  }, [null, 0])

  return (
    <div>
      <RegionViewer
        width={1000}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
        // broadcast={setRegionViewerAttributes}
      >
        <CoverageTrack
          title={'Coverage'}
          height={200}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
        />
        <TranscriptTrack
          transcriptsGrouped={transcriptsGrouped}
          height={10}
          selectedTissue={maxTissue[0]}
        />
        {showVariants &&
          <VariantTrack
            key={'All-variants'}
            title={`variants (${allVariants.size})`}
            height={60}
            color={'#75757'}
            markerConfig={markerExacClassic}
            variants={variantsReversed}
          />}
        <NavigatorConnected />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setRegionViewerAttributes: PropTypes.func.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    // allVariants: allVariantsInCurrentDatasetAsList(state),
    allVariants: finalFilteredVariants(state),
    selectedVariantDataset: selectedVariantDataset(state),
  }),
  dispatch => ({
    setRegionViewerAttributes: regionViewerAttributes =>
      dispatch(activeActions.setRegionViewerAttributes(regionViewerAttributes))
  })
)(GeneRegion)
