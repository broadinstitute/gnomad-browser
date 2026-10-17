import React from 'react'
import { afterEach, describe, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'

import { SizeMe } from '../../../tests/__mocks__/react-sizeme'
import {
  resetSizeMeMockDimensions,
  setSizeMeMockDimensions,
} from '../../../tests/__helpers__/sizeMeMockDimensions'

const renderMeasuredDimensions = () => {
  return render(
    <SizeMe>
      {({ size }) => {
        return <output aria-label="Measured dimensions">{`${size.width} × ${size.height}`}</output>
      }}
    </SizeMe>
  )
}

afterEach(resetSizeMeMockDimensions)

describe('SizeMe mock measurements', () => {
  test('reports the default dimensions when no override is configured', () => {
    renderMeasuredDimensions()
    expect(screen.getByLabelText('Measured dimensions')).toHaveTextContent('1200 × 500')
  })

  test('overrides the configured dimension while preserving the other default', () => {
    setSizeMeMockDimensions({ width: 640 })
    renderMeasuredDimensions()
    expect(screen.getByLabelText('Measured dimensions')).toHaveTextContent('640 × 500')
  })

  test('restores the default dimensions after an override is reset', () => {
    setSizeMeMockDimensions({ width: 640, height: 300 })
    resetSizeMeMockDimensions()
    renderMeasuredDimensions()
    expect(screen.getByLabelText('Measured dimensions')).toHaveTextContent('1200 × 500')
  })
})
