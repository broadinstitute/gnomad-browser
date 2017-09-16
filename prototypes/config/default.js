const path = require('path')

module.exports = {
  API_URL: 'http://gnomad-api.broadinstitute.org',
  // API_URL: 'localhost:8006',
  TEST_DATA_DIRECTORY: path.resolve(__dirname, '../test/data'),
}
