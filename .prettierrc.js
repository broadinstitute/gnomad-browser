module.exports = {
  printWidth: 100,
  semi: false,
  singleQuote: true,
  overrides: [
    {
      files: 'browser/**/*.js',
      options: {
        arrowParens: 'avoid',
      },
    },
    {
      files: 'reads/**/*.js',
      options: {
        arrowParens: 'avoid',
      },
    },
  ],
}
