import PropTypes from 'prop-types'
import React from 'react'

import { PopulationsTable } from './PopulationsTable'

const TGP_POPULATION_GROUPS = {
  African: ['acb', 'asw', 'esn', 'gwd', 'lwk', 'msl', 'yri'],
  'Admixed American': ['clm', 'mxl', 'pel', 'pur'],
  'East Asian': ['cdx', 'chb', 'chs', 'jpt', 'khv'],
  European: ['ceu', 'fin', 'gbr', 'ibs', 'tsi'],
  'South Asian': ['beb', 'gih', 'itu', 'pjl', 'stu'],
}

const TGP_POPULATION_NAMES = {
  acb: 'African Caribbeans in Barbados',
  asw: 'Americans of African Ancestry in SW USA',
  beb: 'Bengali from Bangladesh',
  cdx: 'Chinese Dai in Xishuangbanna, China',
  ceu: 'Utah Residents (CEPH) with Northern and Western European Ancestry',
  chb: 'Han Chinese in Beijing, China',
  chs: 'Southern Han Chinese',
  clm: 'Colombians from Medellin, Colombia',
  esn: 'Esan in Nigeria',
  fin: 'Finnish in Finland',
  gbr: 'British in England and Scotland',
  gih: 'Gujarati Indian from Houston, Texas',
  gwd: 'Gambian in Western Divisions in the Gambia',
  ibs: 'Iberian Population in Spain',
  itu: 'Indian Telugu from the UK',
  jpt: 'Japanese in Tokyo, Japan',
  khv: 'Kinh in Ho Chi Minh City, Vietnam',
  lwk: 'Luhya in Webuye, Kenya',
  msl: 'Mende in Sierra Leone',
  mxl: 'Mexican Ancestry from Los Angeles, USA',
  pel: 'Peruvians from Lima, Peru',
  pjl: 'Punjabi from Lahore, Pakistan',
  pur: 'Puerto Ricans from Puerto Rico',
  stu: 'Sri Lankan Tamil from the UK',
  tsi: 'Toscani in Italia',
  yri: 'Yoruba in Ibadan, Nigeria',
}

const addPopulationNames = populations => {
  return populations.map(pop => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      name = TGP_POPULATION_NAMES[pop.id] || pop.id
    }
    return { ...pop, name }
  })
}

const groupPopulations = populations => {
  const populationsById = populations.reduce(
    (acc, pop) => ({
      ...acc,
      [pop.id]: pop,
    }),
    {}
  )

  // TODO: Improve this
  const groupedPopulations = []
  Object.keys(TGP_POPULATION_GROUPS).forEach(group => {
    groupedPopulations.push({
      id: group,
      name: group,
      ac: TGP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].ac)
        .reduce((a, b) => a + b),
      an: TGP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].an)
        .reduce((a, b) => a + b),
      ac_hom: TGP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].ac_hom)
        .reduce((a, b) => a + b),
      ac_hemi: TGP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].ac_hemi)
        .reduce((a, b) => a + b),
      subpopulations: [
        ...TGP_POPULATION_GROUPS[group].map(popId => populationsById[popId]),
        {
          id: `${group}_XX`,
          name: 'XX',
          ac: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].ac)
            .reduce((a, b) => a + b),
          an: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].an)
            .reduce((a, b) => a + b),
          ac_hom: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].ac_hom)
            .reduce((a, b) => a + b),
          ac_hemi: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].ac_hemi)
            .reduce((a, b) => a + b),
        },
        {
          id: `${group}_XY`,
          name: 'XY',
          ac: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].ac)
            .reduce((a, b) => a + b),
          an: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].an)
            .reduce((a, b) => a + b),
          ac_hom: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].ac_hom)
            .reduce((a, b) => a + b),
          ac_hemi: TGP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].ac_hemi)
            .reduce((a, b) => a + b),
        },
      ],
    })
  })

  groupedPopulations.push(populationsById.XX, populationsById.XY)

  return groupedPopulations
}

const TGPPopulationsTable = ({ populations, showHemizygotes, showHomozygotes }) => {
  const renderedPopulations = groupPopulations(addPopulationNames(populations))

  return (
    <div>
      <PopulationsTable
        populations={renderedPopulations}
        showHemizygotes={showHemizygotes}
        showHomozygotes={showHomozygotes}
      />
    </div>
  )
}

TGPPopulationsTable.propTypes = {
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      ac_hemi: PropTypes.number,
      ac_hom: PropTypes.number.isRequired,
    })
  ).isRequired,
  showHemizygotes: PropTypes.bool,
  showHomozygotes: PropTypes.bool,
}

TGPPopulationsTable.defaultProps = {
  showHemizygotes: true,
  showHomozygotes: true,
}

export default TGPPopulationsTable
