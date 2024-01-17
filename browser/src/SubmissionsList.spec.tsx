import React from 'react'
import { describe, test, expect } from '@jest/globals'
import SubmissionsList from './SubmissionsList'
import { createRenderer } from 'react-test-renderer/shallow'

import clinvarVariantFactory from './__factories__/ClinvarVariant'

describe('SubmissionsList', () => {
  const clinvarVariant = clinvarVariantFactory.build()

  test('has no unexpected changes', () => {
    const tree = createRenderer().render(
      <SubmissionsList submissions={clinvarVariant.submissions} />
    )
    expect(tree).toMatchSnapshot()
  })
})
