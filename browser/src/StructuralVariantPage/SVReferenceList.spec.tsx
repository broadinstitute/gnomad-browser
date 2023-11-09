import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'

import { forAllDatasets } from '../../../tests/__helpers__/datasets'
import SVReferenceList from './SVReferenceList'
import structuralVariantFactory from '../__factories__/StructuralVariant'
import { svTypes } from '../StructuralVariantList/structuralVariantTypes'

forAllDatasets('SVReferenceList with dataset %s selected', (datasetId) => {
  describe.each(svTypes)('for SV of type %s', (variantType: string) => {
    test('has no unexpected changes', () => {
      const sv = structuralVariantFactory.build({ type: variantType })
      const tree = renderer.create(<SVReferenceList variant={sv} datasetId={datasetId} />)
      expect(tree).toMatchSnapshot()
    })
  })
})
