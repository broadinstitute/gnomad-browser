/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import R from 'ramda'

import RegionViewer from '@broad/region'
import TranscriptTrack from '@broad/track-transcript'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import Navigator from '@broad/gene-page/src/containers/Navigator'
import { groupExonsByTranscript } from '@broad/utilities/src/transcriptTools'
import { exonPadding, actions } from '@broad/gene-page/src/resources/active'
import { geneData } from '@broad/gene-page/src/resources/genes'
import { allVariantsInCurrentDatasetAsList } from '@broad/gene-page/src/resources/variants'

// import VariantDensityTrack from './VariantDensityTrack'

// const exonColor = '#475453'
const paddingColor = '#5A5E5C'
const masterExonThickness = '20px'
const masterPaddingThickness = '3px'

const attributeConfig = {
  CDS: {
    color: '#424242',
    thickness: masterExonThickness,
  },
  start_pad: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  end_pad: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  intron: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  default: {
    color: 'grey',
    thickness: masterPaddingThickness,
  },
}

const markerConfigLoF = {
  markerType: 'af',
  circleRadius: 3,
  circleStroke: 'black',
  circleStrokeWidth: 1,
  yPositionSetting: 'random',
  fillColor: 'red',
  afMax: 0.001,
}

const lof = ['splice_acceptor_variant', 'splice_donor_variant', 'stop_gained', 'frameshift_variant']
const missense = ['missense_variant']

const consequenceCategories = [
  { annotation: 'lof', groups: lof, colour: '#757575' },
  { annotation: 'missense', groups: missense, colour: '#757575' },
]

const factor = 50

const GeneRegion = ({
  gene,
  allVariants,
  exonPadding,
  setRegionViewerAttributes,
}) => {
  const geneJS = gene.toJS()
  const geneExons = geneJS.exons
  const canonicalExons = geneJS.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)
  const { exome_coverage, genome_coverage } = geneJS

  const splitTracks = consequenceCategories.map((consequence) => {
    let rowHeight
    const filteredVariants = allVariants.filter(variant =>
      R.contains(variant.consequence, consequence.groups))
    if (filteredVariants.size / factor < 20) {
      rowHeight = 20
    } else {
      rowHeight = filteredVariants.size / factor
    }
    return (
      <VariantTrack
        key={`${consequence.annotation}`}
        title={`${consequence.annotation} (${filteredVariants.size})`}
        height={rowHeight}
        markerConfig={markerConfigLoF}
        variants={filteredVariants}
      />
    )
  })

  const markerConfigOther = {
    markerType: 'af',
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: '#757575',
    afMax: 0.001,
  }

  // const markerConfigDensity = {
  //   markerType: 'density',
  //   stroke: 1,
  // }

  const otherVariants = allVariants.filter(v =>
    !R.contains(v.consequence, [...lof, ...missense]))

  let otherHeight
  if (otherVariants.size / factor < 20) {
    otherHeight = 20
  } else {
    otherHeight = otherVariants.size / factor
  }

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={`other (${otherVariants.size})`}
      height={otherHeight}
      color={'#75757'}
      markerConfig={markerConfigOther}
      variants={otherVariants}
    />
  )

  // const coverageConfigClassic = {
  //   datasets: [
  //     {
  //       name: 'exome',
  //       data: exome_coverage,
  //       type: 'area',
  //       color: 'rgba(70, 130, 180, 1)',
  //       opacity: 1,
  //     },
  //     {
  //       name: 'genome',
  //       data: genome_coverage,
  //       type: 'line',
  //       color: 'rgba(115, 171, 61,  1)',
  //       strokeWidth: 4,
  //       opacity: 1,
  //     },
  //   ],
  // }

  const coverageConfig = {
    datasets: [
      {
        name: 'exome',
        data: exome_coverage,
        type: 'area',
        color: 'rgba(70, 130, 180, 1)',
        opacity: 0.5,
      },
      {
        name: 'genome',
        data: genome_coverage,
        type: 'area',
        color: 'rgba(115, 171, 61,  1)',
        strokeWidth: 4,
        opacity: 0.5,
      },
    ],
  }



  return (
    <div>
      <RegionViewer
        width={1000}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
        broadcast={setRegionViewerAttributes}
      >
        <CoverageTrack
          title={'Coverage'}
          height={90}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
        />
        <TranscriptTrack
          transcriptsGrouped={transcriptsGrouped}
          height={10}
        />
        {splitTracks}
        {allTrack}
        {/*<VariantDensityTrack />*/}
        <Navigator />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setRegionViewerAttributes: PropTypes.func.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    allVariants: allVariantsInCurrentDatasetAsList(state),
  }),
  dispatch => ({
    setRegionViewerAttributes: regionViewerAttributes =>
      dispatch(actions.setRegionViewerAttributes(regionViewerAttributes))
  })
)(GeneRegion)
