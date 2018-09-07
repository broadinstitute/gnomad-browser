const paddingColor = '#5A5E5C'
const masterExonThickness = '20px'
const masterPaddingThickness = '3px'

export const coverageConfigClassic = (exomeCoverage, genomeCoverage) => ({
  datasets: [
    {
      color: 'rgba(70, 130, 180, 1)',
      data: exomeCoverage,
      name: 'exome',
      opacity: 1,
      type: 'area',
    },
    {
      color: 'rgba(115, 171, 61,  1)',
      data: genomeCoverage,
      name: 'genome',
      opacity: 1,
      strokeWidth: 5,
      type: 'line',
    },
  ],
})

export const coverageConfigNew = (exomeCoverage, genomeCoverage) => ({
  datasets: [
    {
      color: 'rgba(70, 130, 180, 1)',
      data: exomeCoverage,
      name: 'exome',
      opacity: 0.7,
      type: 'area',
    },
    {
      color: 'rgba(115, 171, 61,  1)',
      data: genomeCoverage,
      name: 'genome',
      opacity: 0.5,
      strokeWidth: 4,
      type: 'area',
    },
  ],
})

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
