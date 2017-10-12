// const exonColor = '#475453'
const paddingColor = '#5A5E5C'
const masterExonThickness = '20px'
const masterPaddingThickness = '3px'

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

  let otherHeight
  if (allVariants.size / factor < 20) {
    otherHeight = 20
  } else {
    otherHeight = allVariants.size / factor
  }
