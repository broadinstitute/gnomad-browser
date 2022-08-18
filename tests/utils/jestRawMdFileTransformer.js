const path = require('path')

module.exports = {
  process(sourceText, sourcePath) {
    return {
      code: `module.exports = 
      { 
        "id": ${JSON.stringify(path.basename(sourcePath).split('.')[0])},
        "title": ${JSON.stringify(path.basename(sourcePath).split('.')[0])},
        "html": ${JSON.stringify(sourceText)},
        "question": ${JSON.stringify(path.basename(sourcePath))}
      }`,
    }
  },
}
