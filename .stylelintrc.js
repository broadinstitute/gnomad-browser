module.exports = {
  processors: ['stylelint-processor-styled-components'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-styled-components',
    'stylelint-config-idiomatic-css',
  ],
  syntax: 'scss',
  rules: {
    // This rule sometimes conflicts with ESLint and Prettier in styled components
    // that contain multi-line functions
    'declaration-colon-newline-after': null,
    'unit-whitelist': ['%', 'deg', 'em', 'rem', 's', 'px'],
  },
  ignoreFiles: './**/node_modules/**/*',
}
