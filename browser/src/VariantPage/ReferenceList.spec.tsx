import { describe, expect, test } from '@jest/globals'
import 'jest-styled-components'

import { NcbiReference, ClinvarReference } from './ReferenceList'

describe('ReferenceLists NCBI external link', () => {
  test('is formatted as single hyperlink if the given array only contains 1 rsid', () =>
    expect(NcbiReference(['rs12345'])).toMatchSnapshot())

  test('is formatted as multiple comma seperated hyperlinks if the given array contains more than 1 rsid', () =>
    expect(NcbiReference(['rs12345', 'rs23456', 'rs34567'])).toMatchSnapshot())
})

describe('ReferenceLists ClinVar external link', () => {
  test('is formatted as single hyperlink with the given clinvar id', () =>
    expect(ClinvarReference('12345')).toMatchSnapshot())
})
