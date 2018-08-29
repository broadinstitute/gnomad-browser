module.exports = {
  processors: ['stylelint-processor-styled-components'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-styled-components',
    'stylelint-config-idiomatic-css',
  ],
  syntax: 'scss',
  rules: {
    'color-hex-case': null,
    'comment-empty-line-before': null,
    'comment-whitespace-inside': null,
    'number-leading-zero': null,
    'unit-whitelist': [
      ['em', 'rem', 's', 'px'],
      {
        ignoreProperties: {
          '%': ['max-width', 'min-width', 'width'],
        },
      },
    ],
  },
  ignoreFiles: './**/node_modules/**/*',
}
