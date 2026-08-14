/** @jest-environment node */

import {
  areExperimentalFeaturesEnabled,
  experimentalFeatureIsSelected,
  isExperimentalFeatureEnabled,
} from './experimentalFeatures'

const flagName = '__EXPERIMENTAL_FEATURES_ENABLED__'
const originalFlag = (globalThis as any)[flagName]

const restoreFlag = () => {
  if (originalFlag === undefined) {
    delete (globalThis as any)[flagName]
  } else {
    ;(globalThis as any)[flagName] = originalFlag
  }
}

afterEach(restoreFlag)

describe('experimental feature URL opt-in', () => {
  test.each([
    ['', false],
    ['?experimental=false', false],
    ['?experimental=1', false],
    ['?experimental=', false],
    ['?experimental=TRUE', false],
    ['?experimental=trueish', false],
    ['?experimental=true', true],
    ['?other=value&experimental=true', true],
  ])('requires the exact global opt-in value in %s', (search, expected) => {
    delete (globalThis as any)[flagName]
    expect(areExperimentalFeaturesEnabled(search)).toBe(expected)
  })

  test('selects only exact comma-separated feature names', () => {
    const search =
      '?experimental_features=haplotype_plot,methylation_context&experimental_features=unknown'

    expect(experimentalFeatureIsSelected('haplotype_plot', search)).toBe(true)
    expect(experimentalFeatureIsSelected('methylation_context', search)).toBe(true)
    expect(experimentalFeatureIsSelected('expanded_variants', search)).toBe(false)
    expect(
      experimentalFeatureIsSelected('haplotype_plot', '?experimental_features=haplotype_plotx')
    ).toBe(false)
    expect(experimentalFeatureIsSelected('haplotype_plot', '?experimental_features=')).toBe(false)
  })

  test('the immutable build flag enables every feature regardless of URL values', () => {
    ;(globalThis as any)[flagName] = true

    expect(isExperimentalFeatureEnabled('haplotype_plot', '')).toBe(true)
    expect(isExperimentalFeatureEnabled('expanded_variants', '?experimental=false')).toBe(true)
    expect(
      isExperimentalFeatureEnabled('methylation_context', '?experimental_features=unknown')
    ).toBe(true)
  })

  test('combines the global URL override and selective URL list when the build is false', () => {
    ;(globalThis as any)[flagName] = false

    expect(isExperimentalFeatureEnabled('expanded_variants', '?experimental=true')).toBe(true)
    expect(
      isExperimentalFeatureEnabled('expanded_variants', '?experimental_features=expanded_variants')
    ).toBe(true)
    expect(
      isExperimentalFeatureEnabled('haplotype_plot', '?experimental_features=expanded_variants')
    ).toBe(false)
  })

  test('the current-location wrapper fails closed without a browser window', () => {
    delete (globalThis as any)[flagName]

    expect(() => isExperimentalFeatureEnabled('haplotype_plot')).not.toThrow()
    expect(isExperimentalFeatureEnabled('haplotype_plot')).toBe(false)
  })
})
