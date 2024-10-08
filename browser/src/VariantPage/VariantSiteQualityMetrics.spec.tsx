import React from 'react'
import { describe, expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'
// import { render, screen, within, act } from '@testing-library/react'
import { forDatasetsMatching } from '../../../tests/__helpers__/datasets'
import VariantSiteQualityMetrics from './VariantSiteQualityMetrics'
import { v2VariantFactory, v3VariantFactory } from '../__factories__/Variant'
import { BrowserRouter } from 'react-router-dom'
// import userEvent from '@testing-library/user-event'
import 'jest-styled-components'

describe('Variant Site Quality Metric', () => {
  const metrics = [
    'SiteQuality',
    'AS_VarDP',
    'InbreedingCoeff',
    'AS_FS',
    'AS_MQ',
    'AS_MQRankSum',
    'AS_pab_max',
    'AS_QUALapprox',
    'AS_QD',
    'AS_ReadPosRankSum',
    'AS_SOR',
    'AS_VarDP',
    'AS_VQSLOD',
  ]
  forDatasetsMatching(/gnomad_r3/, 'VariantSiteQualityMetrics with the dataset %s', (datasetId) => {
    metrics.forEach((metric) => {
      test(`renders correctly for metric: ${metric} with default props`, async () => {
        const variant = v3VariantFactory.build()
        const tree = renderer.create(
          <BrowserRouter>
            <VariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
          </BrowserRouter>
        )
        expect(tree).toMatchSnapshot()
      })
    })
  })
  //   test(`renders correctly for selecting: ${metric}`, async () => {
  //     const variant = v3VariantFactory.build()
  //     act(() => {
  //       render(
  //         <BrowserRouter>
  //           <VariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
  //         </BrowserRouter>
  //       )
  //       const selectElement = screen.getByLabelText('Metric:')

  //       const option = within(selectElement).getByText(metric)

  //       userEvent.selectOptions(selectElement, option)
  //     })

  //     const metricsWithLog = ['SiteQuality', 'AS_VarDP', 'AS_QUALapprox']
  //     const expectedLabel = metricsWithLog.includes(metric) ? `log(${metric})` : `${metric}`
  //     const xAxisLabel = screen.findByText(expectedLabel, { selector: 'span' })
  //     expect(xAxisLabel).not.toBeNull()
  //   })

  forDatasetsMatching(/gnomad_r2/, 'VariantSiteQualityMetrics with the dataset %s', (datasetId) => {
    metrics.forEach((metric) => {
      test(`renders correctly for metric: ${metric} with default props`, async () => {
        const variant = v2VariantFactory.build()
        const tree = renderer.create(
          <BrowserRouter>
            <VariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
          </BrowserRouter>
        )
        expect(tree).toMatchSnapshot()
      })
    })
  })
})
