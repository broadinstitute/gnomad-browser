import React from 'react'

import { GenePageHoc } from '@broad/redux-genes'
import { VariantTable } from '@broad/table'
import {
  GenePage,
  Summary,
} from '@broad/ui'

import VariantDetails from '../VariantDetails'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import tableConfig from './tableConfig'
import { fetchSchz } from './fetch'


const MainPage = () => {
  return (
    <GenePage>
      <Summary>
        <GeneInfo />
      </Summary>
      <RegionViewer />
      <GeneSettings />
      <VariantTable tableConfig={tableConfig} />
      <VariantDetails />
    </GenePage>
  )
}

export default GenePageHoc(MainPage, fetchSchz)
