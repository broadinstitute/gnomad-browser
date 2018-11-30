import fs from 'fs'
import path from 'path'

import ejs from 'ejs'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const renderTemplate = async data => {
  const templatePath = path.resolve(__dirname, 'index.ejs')

  // In development, the client webpack compilation may not have finished
  // by the time the server is started. So we have to wait for the template
  // file to be written.
  if (process.env.NODE_ENV === 'development') {
    let templateExists = false
    while (!templateExists) {
      try {
        fs.accessSync(templatePath)
        templateExists = true
      } catch (err) {
        console.log('waiting for template')
        // eslint-disable-next-line no-await-in-loop
        await sleep(2000)
      }
    }
  }

  const template = fs.readFileSync(templatePath, { encoding: 'utf8' })
  return ejs.render(template, data)
}

export default renderTemplate
