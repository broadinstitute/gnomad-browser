import React from 'react'

import { RegionHoc } from '@broad/region'
import { VariantTable } from '@broad/table'
import { GenePage, Summary, TableSection } from '@broad/ui'

import Settings from '../Settings'
import tableConfig from '../tableConfig'
import { fetchRegion } from './fetch'
import RegionInfo from './RegionInfo'
import RegionViewer from './RegionViewer'

const RegionPage = () => (
  <GenePage>
    <Summary>
      <RegionInfo />
    </Summary>
    <RegionViewer coverageStyle={'new'} />
    <TableSection>
      <Settings />
      <VariantTable tableConfig={tableConfig} />
    </TableSection>
  </GenePage>
)

export default RegionHoc(RegionPage, fetchRegion, 'gnomadCombinedVariants')
