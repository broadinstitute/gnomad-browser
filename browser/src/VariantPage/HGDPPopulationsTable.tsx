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

const addPopulationNames = (populations: any) => {
  return populations.map((pop: any) => {
    let name
    if (pop.id === 'XX' || pop.id.endsWith('_XX')) {
      name = 'XX'
    } else if (pop.id === 'XY' || pop.id.endsWith('_XY')) {
      name = 'XY'
    } else {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      name = HGDP_POPULATION_NAMES[pop.id] || pop.id
    }
    return { ...pop, name }
  })
}

const groupPopulations = (populations: any) => {
  const populationsById = populations.reduce(
    // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
    (acc, pop) => ({
      ...acc,
      [pop.id]: pop,
    }),
    {}
  )

  // TODO: Improve this
  const groupedPopulations = []
  Object.keys(HGDP_POPULATION_GROUPS).forEach((group) => {
    groupedPopulations.push({
      id: group,
      name: group,
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      ac: HGDP_POPULATION_GROUPS[group]
        .map((popId: any) => populationsById[popId].ac)
        .reduce((a: any, b: any) => a + b),
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      an: HGDP_POPULATION_GROUPS[group]
        .map((popId: any) => populationsById[popId].an)
        .reduce((a: any, b: any) => a + b),
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      ac_hom: HGDP_POPULATION_GROUPS[group]
        .map((popId: any) => populationsById[popId].ac_hom)
        .reduce((a: any, b: any) => a + b),
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      ac_hemi: HGDP_POPULATION_GROUPS[group]
        .map((popId: any) => populationsById[popId].ac_hemi)
        .reduce((a: any, b: any) => a + b),
      subpopulations: [
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        ...HGDP_POPULATION_GROUPS[group].map((popId: any) => populationsById[popId]),
        {
          id: `${group}_XX`,
          name: 'XX',
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ac: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XX`].ac)
            .reduce((a: any, b: any) => a + b),
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          an: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XX`].an)
            .reduce((a: any, b: any) => a + b),
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ac_hom: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XX`].ac_hom)
            .reduce((a: any, b: any) => a + b),
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ac_hemi: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XX`].ac_hemi)
            .reduce((a: any, b: any) => a + b),
        },
        {
          id: `${group}_XY`,
          name: 'XY',
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ac: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XY`].ac)
            .reduce((a: any, b: any) => a + b),
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          an: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XY`].an)
            .reduce((a: any, b: any) => a + b),
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ac_hom: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XY`].ac_hom)
            .reduce((a: any, b: any) => a + b),
          // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          ac_hemi: HGDP_POPULATION_GROUPS[group]
            .map((popId: any) => populationsById[`${popId}_XY`].ac_hemi)
            .reduce((a: any, b: any) => a + b),
        },
      ],
    })
  })

  groupedPopulations.push(populationsById.XX, populationsById.XY)

  return groupedPopulations
}

type OwnHGDPPopulationsTableProps = {
  populations: {
    id: string
    ac: number
    an: number
    ac_hemi?: number
    ac_hom: number
  }[]
  showHemizygotes?: boolean
  showHomozygotes?: boolean
}

// @ts-expect-error TS(2456) FIXME: Type alias 'HGDPPopulationsTableProps' circularly ... Remove this comment to see the full error message
type HGDPPopulationsTableProps = OwnHGDPPopulationsTableProps &
  typeof HGDPPopulationsTable.defaultProps

// @ts-expect-error TS(7022) FIXME: 'HGDPPopulationsTable' implicitly has type 'any' b... Remove this comment to see the full error message
const HGDPPopulationsTable = ({
  populations,
  showHemizygotes,
  showHomozygotes,
}: HGDPPopulationsTableProps) => {
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

HGDPPopulationsTable.defaultProps = {
  showHemizygotes: true,
  showHomozygotes: true,
}

export default HGDPPopulationsTable
