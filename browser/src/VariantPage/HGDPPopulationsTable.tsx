import React from 'react'

import { Badge } from '@gnomad/ui'

import { PopulationsTable } from './PopulationsTable'
import { DatasetId, isV3 } from '@gnomad/dataset-metadata/metadata'

const HGDP_POPULATION_GROUPS_V4 = {
  African: ['bantukenya', 'bantusouthafrica', 'biaka', 'mandenka', 'mbuti', 'san', 'yoruba'],
  'East Asian': [
    'cambodian',
    'dai',
    'daur',
    'han',
    'hezhen',
    'japanese',
    'lahu',
    'miao',
    'mongolian',
    'naxi',
    'northernhan',
    'oroqen',
    'she',
    'tu',
    'tujia',
    'xibo',
    'yakut',
    'yi',
  ],
  European: ['adygei', 'basque', 'french', 'bergamoitalian', 'orcadian', 'russian', 'sardinian', 'tuscan'],
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
    'uygur',
  ],
  'Oceanian': ['bougainville', 'papuanhighlands', 'papuansepik'],
}

const HGDP_POPULATION_NAMES_V4 = {
  adygei: 'Adygei',
  balochi: 'Balochi',
  bantukenya: 'Bantu (Kenya)',
  bantusouthafrica: 'Bantu (South Africa)',
  basque: 'Basque',
  bedouin: 'Bedouin',
  bergamoitalian: 'Bergamo (Italian)',
  biaka: 'Biaka',
  brahui: 'Brahui',
  burusho: 'Burusho',
  bougainville: 'Bougainville',
  cambodian: 'Cambodian',
  colombian: 'Colombian',
  dai: 'Dai',
  daur: 'Daur',
  druze: 'Druze',
  french: 'French',
  han: 'Han',
  hazara: 'Hazara',
  hezhen: 'Hezhen',
  japanese: 'Japanese',
  kalash: 'Kalash',
  karitiana: 'Karitiana',
  lahu: 'Lahu',
  makrani: 'Makrani',
  mandenka: 'Mandenka',
  maya: 'Maya',
  mbuti: 'Mbuti',
  miao: 'Miao',
  mongolian: 'Mongolian',
  mozabite: 'Mozabite',
  naxi: 'Naxi',
  northernhan: 'Northern Han',
  orcadian: 'Orcadian',
  oroqen: 'Oroqen',
  palestinian: 'Palestinian',
  papuanhighlands: 'Papuan (Highlands)',
  papuansepik: 'Papuan (Sepik)',
  pathan: 'Pathan',
  pima: 'Pima',
  russian: 'Russian',
  san: 'San',
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
  yi: 'Yi',
  yoruba: 'Yoruba',
}

const HGDP_POPULATION_GROUPS_V3 = {
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

const HGDP_POPULATION_NAMES_V3 = {
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

const addPopulationNames = (populations: any, datasetId: DatasetId) => {
  const HGDP_POPULATION_NAMES = isV3(datasetId) ? HGDP_POPULATION_NAMES_V3 : HGDP_POPULATION_NAMES_V4

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


function compareArrays(arr1: string[], arr2: string[]) {
  const uniqueArr1 = new Set(arr1);
  const uniqueArr2 = new Set(arr2);

  let areSame = true;

  for (let item of uniqueArr1) {
    if (!uniqueArr2.has(item)) {
      console.error(`Element "${item}" is in the first array but not in the second array.`);
      areSame = false;
    }
  }

  if (!areSame) {
    throw new Error("Population definitions don't match")
  }
}

const groupPopulations = (populations: any, datasetId: DatasetId) => {
  const populationsById = populations.reduce(
    // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
    (acc, pop) => ({
      ...acc,
      [pop.id]: pop,
    }),
    {}
  )

  const HGDP_POPULATION_GROUPS = isV3(datasetId) ? HGDP_POPULATION_GROUPS_V3 : HGDP_POPULATION_GROUPS_V4

  // TODO: Improve this
  const groupedPopulations = []
  Object.keys(HGDP_POPULATION_GROUPS).forEach((group) => {
    // @ts-ignore
    compareArrays(HGDP_POPULATION_GROUPS[group], Object.keys(populationsById))
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
  datasetId: DatasetId
}

// @ts-expect-error TS(2456) FIXME: Type alias 'HGDPPopulationsTableProps' circularly ... Remove this comment to see the full error message
type HGDPPopulationsTableProps = OwnHGDPPopulationsTableProps &
  typeof HGDPPopulationsTable.defaultProps

// @ts-expect-error TS(7022) FIXME: 'HGDPPopulationsTable' implicitly has type 'any' b... Remove this comment to see the full error message
const HGDPPopulationsTable = ({
  populations,
  showHemizygotes,
  showHomozygotes,
  datasetId
}: HGDPPopulationsTableProps) => {
  const renderedPopulations = groupPopulations(addPopulationNames(populations, datasetId), datasetId)

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
