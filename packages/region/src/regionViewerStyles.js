/* eslint-disable camelcase */
const paddingColor = '#5A5E5C'
const masterExonThickness = '20px'
const masterPaddingThickness = '3px'

export const coverageConfigClassic = (exome_coverage, genome_coverage) => {
  return { datasets: [
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
      strokeWidth: 5,
      opacity: 1,
    },
  ] }
}

export const coverageConfigNew = (exome_coverage, genome_coverage) => {
  return { datasets: [
    {
      name: 'exome',
      data: exome_coverage,
      type: 'area',
      color: 'rgba(70, 130, 180, 1)',
      opacity: 0.7,
    },
    {
      name: 'genome',
      data: genome_coverage,
      type: 'area',
      color: 'rgba(115, 171, 61,  1)',
      strokeWidth: 4,
      opacity: 0.5,
    },
  ] }
}

export const markerExacClassic = {
  markerType: 'exacClassic',
  circleRadius: 3,
  circleStroke: 'black',
  circleStrokeWidth: 0.5,
  fillColor: '#757575',
  afMax: 0.001,
}

export const attributeConfig = {
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
