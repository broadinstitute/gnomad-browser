import PropTypes from 'prop-types'
import React from 'react'

import { Badge } from '@gnomad/ui'

import { PopulationsTable } from './PopulationsTable'

const HGDP_POPULATION_GROUPS = {
  African: ['bantukenya', 'bantusafrica', 'mandenka', 'yoruba'],
  'East Asian': [
    'cambodian',
    'dai',
    'daur',
    'han',
    'hezhen',
    'japanese',
    'lahu',
    'miaozu',
    'mongola',
    'naxi',
    'oroqen',
    'she',
    'tu',
    'tujia',
    'uygur',
    'xibo',
    'yakut',
    'yizu',
  ],
  European: ['adygei', 'basque', 'french', 'italian', 'orcadian', 'russian', 'sardinian', 'tuscan'],
  'Middle Eastern': ['bedouin', 'druze', 'mozabite', 'palestinian'],
  'Native American': ['colombian', 'karitiana', 'maya', 'pima', 'surui'],
  'Central/South Asian': [
    'balochi',
    'brahui',
    'burusho',
    'hazara',
    'kalash',
    'makrani',
    'pathan',
    'sindhi',
  ],
}

const HGDP_POPULATION_NAMES = {
  adygei: 'Adygei',
  balochi: 'Balochi',
  bantukenya: 'Bantu (Kenya)',
  bantusafrica: 'Bantu (South Africa)',
  basque: 'Basque',
  bedouin: 'Bedouin',
  brahui: 'Brahui',
  burusho: 'Burusho',
  cambodian: 'Cambodian',
  colombian: 'Colombian',
  dai: 'Dai',
  daur: 'Daur',
  druze: 'Druze',
  french: 'French',
  han: 'Han',
  hazara: 'Hazara',
  hezhen: 'Hezhen',
  italian: 'Italian',
  japanese: 'Japanese',
  kalash: 'Kalash',
  karitiana: 'Karitiana',
  lahu: 'Lahu',
  makrani: 'Makrani',
  mandenka: 'Mandenka',
  maya: 'Maya',
  miaozu: 'Miaozu',
  mongola: 'Mongola',
  mozabite: 'Mozabite',
  naxi: 'Naxi',
  orcadian: 'Orcadian',
  oroqen: 'Oroqen',
  palestinian: 'Palestinian',
  pathan: 'Pathan',
  pima: 'Pima',
  russian: 'Russian',
  sardinian: 'Sardinian',
  she: 'She',
  sindhi: 'Sindhi',
  surui: 'Surui',
  tu: 'Tu',
  tujia: 'Tujia',
  tuscan: 'Tuscan',
  uygur: 'Uygur',
  xibo: 'Xibo',
  yakut: 'Yakut',
  yizu: 'Yizu',
  yoruba: 'Yoruba',
}

const addPopulationNames = populations => {
  return populations.map(pop => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      name = HGDP_POPULATION_NAMES[pop.id] || pop.id
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
  Object.keys(HGDP_POPULATION_GROUPS).forEach(group => {
    groupedPopulations.push({
      id: group,
      name: group,
      ac: HGDP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].ac)
        .reduce((a, b) => a + b),
      an: HGDP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].an)
        .reduce((a, b) => a + b),
      ac_hom: HGDP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].ac_hom)
        .reduce((a, b) => a + b),
      ac_hemi: HGDP_POPULATION_GROUPS[group]
        .map(popId => populationsById[popId].ac_hemi)
        .reduce((a, b) => a + b),
      subpopulations: [
        ...HGDP_POPULATION_GROUPS[group].map(popId => populationsById[popId]),
        {
          id: `${group}_XX`,
          name: 'XX',
          ac: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].ac)
            .reduce((a, b) => a + b),
          an: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].an)
            .reduce((a, b) => a + b),
          ac_hom: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].ac_hom)
            .reduce((a, b) => a + b),
          ac_hemi: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XX`].ac_hemi)
            .reduce((a, b) => a + b),
        },
        {
          id: `${group}_XY`,
          name: 'XY',
          ac: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].ac)
            .reduce((a, b) => a + b),
          an: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].an)
            .reduce((a, b) => a + b),
          ac_hom: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].ac_hom)
            .reduce((a, b) => a + b),
          ac_hemi: HGDP_POPULATION_GROUPS[group]
            .map(popId => populationsById[`${popId}_XY`].ac_hemi)
            .reduce((a, b) => a + b),
        },
      ],
    })
  })

  groupedPopulations.push(populationsById.XX, populationsById.XY)

  return groupedPopulations
}

const HGDPPopulationsTable = ({ populations, showHemizygotes, showHomozygotes }) => {
  const renderedPopulations = groupPopulations(addPopulationNames(populations))

  return (
    <div>
      <PopulationsTable
        populations={renderedPopulations}
        showHemizygotes={showHemizygotes}
        showHomozygotes={showHomozygotes}
      />
      <p>
        <Badge level="warning">Warning</Badge> Because of low sample sizes for HGDP populations,
        allele frequencies may not be representative.
      </p>
    </div>
  )
}

HGDPPopulationsTable.propTypes = {
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

HGDPPopulationsTable.defaultProps = {
  showHemizygotes: true,
  showHomozygotes: true,
}

export default HGDPPopulationsTable
