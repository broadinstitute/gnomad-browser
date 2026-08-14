// Webpack replaces this browser-native constant at compile time. A source hot update can
// still be compiled by a dev server started before the DefinePlugin entry was added, so
// guard the undeclared identifier and fail closed until the server is restarted.
declare const __EXPERIMENTAL_FEATURES_ENABLED__: boolean

export const areExperimentalFeaturesEnabled = () =>
  typeof __EXPERIMENTAL_FEATURES_ENABLED__ !== 'undefined' &&
  __EXPERIMENTAL_FEATURES_ENABLED__ === true
