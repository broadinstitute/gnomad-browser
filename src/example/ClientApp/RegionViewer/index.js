import React, { PropTypes } from 'react'
import R from 'ramda'

import {
  groupExonsByTranscript,
  RegionViewer,
  TranscriptTrack,
  CoverageTrack,
  VariantTrack,
} from 'react-gnomad'

import Navigator from '../Navigator'

import { getVariantsInGeneForDataset } from '../../../reducers'

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

const getTableIndexByPosition = (position, variants) =>
  variants.findIndex((variant, i) => {
    if (variants[i + 1]) {
      return position >= variant.pos && position <= variants[i + 1].pos
    }
    return variants.length - 1
  })

const onCursorClick = (position) => {
  console.log(`clicked ${getTableIndexByPosition}`)
}

const GeneRegion = ({
  gene,
  minimal_gnomad_variants,
  exonPadding,
}) => {
  const geneExons = gene.exons
  const canonicalExons = gene.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)
  const { exome_coverage, genome_coverage } = gene

  const cats = consequenceCategories.map(c => c.annotation)

  const splitTracks = consequenceCategories.map((consequence, index) => {
    let rowHeight
    const filteredVariants = minimal_gnomad_variants.filter(variant =>
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

  const otherVariants = minimal_gnomad_variants.filter(v =>
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
  // const navPos = minimal_gnomad_variants[visibleInTable[0]].pos
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
  minimal_gnomad_variants: PropTypes.array.isRequired,
}
export default GeneRegion
