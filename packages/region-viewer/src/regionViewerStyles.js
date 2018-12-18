const paddingColor = '#5A5E5C'
const masterExonThickness = '20px'
const masterPaddingThickness = '3px'

export const coverageConfigClassic = (exomeCoverage, genomeCoverage) => [
  {
    color: 'rgb(70, 130, 180)',
    buckets: exomeCoverage,
    name: 'exome',
  },
  {
    color: 'rgb(115, 171, 61)',
    buckets: genomeCoverage,
    name: 'genome',
  },
]

export const coverageConfigNew = (exomeCoverage, genomeCoverage) => [
  {
    color: 'rgba(70, 130, 180, 0.7)',
    buckets: exomeCoverage,
    name: 'exome',
  },
  {
    color: 'rgba(115, 171, 61, 0.5)',
    buckets: genomeCoverage,
    name: 'genome',
  },
]

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
