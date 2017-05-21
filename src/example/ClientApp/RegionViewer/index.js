import React, { PropTypes } from 'react'
import R from 'ramda'

import {
  groupExonsByTranscript,
  RegionViewer,
  TranscriptTrack,
  CoverageTrack,
  VariantTrack,
} from 'react-gnomad'

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
  yPositionSetting: 'center',
  fillColor: 'red',
  afMax: 0.001,
}

const markerConfigAll = {
  markerType: 'af',
  circleRadius: 3,
  circleStroke: 'black',
  circleStrokeWidth: 1,
  yPositionSetting: 'random',
  fillColor: '#757575',
  afMax: 0.001,
}

const consequenceCategories = [
  // { annotation: 'transcript_ablation', colour: '#ed2024' },
  { annotation: 'splice_acceptor_variant', colour: '#757575' },
  { annotation: 'splice_donor_variant', colour: '#757575' },
  { annotation: 'stop_gained', colour: '#757575' },
  { annotation: 'frameshift_variant', colour: '#757575' },
]

const GeneRegion = ({ gene }) => {
  const geneExons = gene.exons
  const canonicalExons = gene.transcript.exons
  const transcriptsGrouped = groupExonsByTranscript(geneExons)
  const { exome_coverage, genome_coverage, minimal_gnomad_variants } = gene
  const cats = consequenceCategories.map(c => c.annotation)

  const splitTracks = consequenceCategories.map((consequence, index) => {
    return (
      <VariantTrack
        key={`${consequence.annotation}-${index}`}
        title={consequence.annotation.replace('_', ' ')}
        height={15}
        color={consequence.colour}
        markerConfig={markerConfigLoF}
        variants={minimal_gnomad_variants.filter(variant =>
           R.contains(consequence.annotation, variant.consequence))
         }
      />
    )
  })

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={'All variants'}
      height={50}
      color={'#757575'}
      markerConfig={markerConfigAll}
      variants={minimal_gnomad_variants.filter(v =>
        !R.contains(cats, v.consequence))}
    />
  )

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
        width={1500}
        padding={80}
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
          height={15}
        />
        {splitTracks}
        {allTrack}
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
}
export default GeneRegion
