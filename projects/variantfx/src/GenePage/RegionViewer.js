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
import VariantTrack from '@broad/track-variant'
import Navigator from '@broad/gene-page/src/containers/Navigator'
import { groupExonsByTranscript } from '@broad/utilities/src/transcriptTools'
import { exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'
import { geneData } from '@broad/gene-page/src/resources/genes'

import {
  allVariantsInCurrentDatasetAsList,
} from '@broad/gene-page/src/resources/variants'

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

const factor = 50

const GeneRegion = ({
  gene,
  allVariants,
  exonPadding,
}) => {
  const geneJS = gene.toJS()
  const geneExons = geneJS.exons
  const canonicalExons = geneJS.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)

  // function getColor (variant) {
  //
  //   const color = scaleLinear()
  //     .domain([])
  // }

  // const modifiedVariants = visibleVariants.map(v => v.set('color', getColor(v)))
  const modifiedVariants = allVariants
  const markerConfigOther = {
    circleRadius: 3,
    circleStroke: 'black',
    circleStrokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: '#757575',

  }

  const lof = ['splice_acceptor_variant', 'splice_donor_variant', 'stop_gained', 'frameshift_variant']
  const missense = ['missense_variant']

  const consequenceCategories = [
    { annotation: 'lof', groups: lof, colour: '#757575' },
    { annotation: 'missense', groups: missense, colour: '#757575' },
  ]

  const factor = 50

  const splitTracks = consequenceCategories.map((consequence, index) => {
    let rowHeight
    const filteredVariants = modifiedVariants.filter(variant =>
      R.contains(variant.Consequence, consequence.groups))
    if (filteredVariants.size / factor < 20) {
      rowHeight = 30
    } else {
      rowHeight = filteredVariants.size / factor
    }
    return (
      <VariantTrack
        key={`${consequence.annotation}-${index}`}
        title={`${consequence.annotation} (${filteredVariants.size})`}
        height={rowHeight}
        markerConfig={markerConfigOther}
        variants={filteredVariants}
      />
    )
  })

  const otherVariants = modifiedVariants.filter(v =>
    !R.contains(v.consequence, [...lof, ...missense]))

  let otherHeight
  if (otherVariants.size / factor < 20) {
    otherHeight = 30
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

  return (
    <div>
      <RegionViewer
        width={1000}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
        leftPanelWidth={100}
      >
        <TranscriptTrack
          transcriptsGrouped={transcriptsGrouped}
          height={10}
        />
        {splitTracks}
        {allTrack}
        {/*<VariantTrack
          key={'odds_ratio'}
          title={''}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigOdds}
          variants={variantsArray}
        />
        <VariantTrack
          key={'scz_af'}
          title={''}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigSczAF}
          variants={variantsArray}
        />
        <VariantTrack
          key={'hc_af'}
          title={''}
          height={100}
          color={'#75757'}
          markerConfig={markerConfigHCAF}
          variants={variantsArray}
        />*/}
        <Navigator noVariants />
      </RegionViewer>
    </div>
  )
}

export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    allVariants: allVariantsInCurrentDatasetAsList(state),
  }),
  dispatch => ({
    setRegionViewerAttributes: regionViewerAttributes =>
      dispatch(activeActions.setRegionViewerAttributes(regionViewerAttributes))
  })
)(GeneRegion)
