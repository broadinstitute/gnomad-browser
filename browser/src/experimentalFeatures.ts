// Webpack replaces this browser-native constant at compile time. A source hot update can
// still be compiled by a dev server started before the DefinePlugin entry was added, so
// guard the undeclared identifier and fail closed until the server is restarted.
declare const __EXPERIMENTAL_FEATURES_ENABLED__: boolean

export type ExperimentalFeature = 'haplotype_plot' | 'expanded_variants' | 'methylation_context'

const currentLocationSearch = () => (typeof window === 'undefined' ? '' : window.location.search)

/** Pure URL check used by the browser wrapper and deterministic tests. */
export const experimentalFeatureIsSelected = (feature: ExperimentalFeature, search = '') =>
  new URLSearchParams(search)
    .getAll('experimental_features')
    .some((value) => value.split(',').includes(feature))

/** The build switch and `experimental=true` intentionally enable every experiment. */
export const areExperimentalFeaturesEnabled = (search = currentLocationSearch()) =>
  (typeof __EXPERIMENTAL_FEATURES_ENABLED__ !== 'undefined' &&
    __EXPERIMENTAL_FEATURES_ENABLED__ === true) ||
  new URLSearchParams(search).getAll('experimental').includes('true')

export const isExperimentalFeatureEnabled = (
  feature: ExperimentalFeature,
  search = currentLocationSearch()
) => areExperimentalFeaturesEnabled(search) || experimentalFeatureIsSelected(feature, search)
