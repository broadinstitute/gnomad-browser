/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PropTypes } from 'react'
import R from 'ramda'

import RegionViewer from 'lens-region'
import TranscriptTrack from 'lens-track-transcript'
import CoverageTrack from 'lens-track-coverage'
import VariantTrack from 'lens-track-variant'
import { groupExonsByTranscript } from 'lens-utilities/lib/transcriptTools'

import Navigator from '../../../containers/Navigator'

import css from './styles.css'

const {
  exonColor,
  paddingColor,
  masterExonThickness,
  masterPaddingThickness,
} = css

const attributeConfig = {
  CDS: {
    color: exonColor,
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
  visibleVariants,
  exonPadding,
}) => {
  const geneJS = gene.toJS()
  const geneExons = geneJS.exons
  const canonicalExons = geneJS.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)
  const { exome_coverage, genome_coverage } = geneJS

  const splitTracks = consequenceCategories.map((consequence, index) => {
    let rowHeight
    const filteredVariants = visibleVariants.filter(variant =>
      R.contains(variant.consequence, consequence.groups))
    if (filteredVariants.length / factor < 20) {
      rowHeight = 20
    } else {
      rowHeight = filteredVariants.length / factor
    }
    return (
      <VariantTrack
        key={`${consequence.annotation}-${index}`}
        title={`${consequence.annotation} (${filteredVariants.length})`}
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

  const otherVariants = visibleVariants.filter(v =>
    !R.contains(v.consequence, [...lof, ...missense]))

  let otherHeight
  if (otherVariants.length / factor < 20) {
    otherHeight = 20
  } else {
    otherHeight = otherVariants.length / factor
  }

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={`Other (${otherVariants.length})`}
      height={otherHeight}
      color={'#75757'}
      markerConfig={markerConfigOther}
      variants={otherVariants}
    />
  )

  const coverageConfigClassic = {
    datasets: [
      {
        name: 'exome',
        data: exome_coverage,
        type: 'area',
        color: 'rgba(70, 130, 180, 1)',
        opacity: 1,
      },
      {
        name: 'genome',
        data: genome_coverage,
        type: 'line',
        color: 'rgba(115, 171, 61,  1)',
        strokeWidth: 4,
        opacity: 1,
      },
    ],
  }

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
    <div className={css.geneRegion}>
      <RegionViewer
        css={css}
        width={1150}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
      >
        <CoverageTrack
          title={'Coverage'}
          height={120}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
        />
        <TranscriptTrack
          css={css}
          transcriptsGrouped={transcriptsGrouped}
          height={10}
        />
        {splitTracks}
        {allTrack}
        <Navigator />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
  visibleVariants: PropTypes.array.isRequired,
  exonPadding: PropTypes.number.isRequired,
}
export default GeneRegion
