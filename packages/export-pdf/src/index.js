import ReactDOMServer from 'react-dom/server'
import pdf from 'html-pdf'
import fs from 'fs'
import path from 'path'

let module

const getBase64String = (path) => {
  try {
    const file = fs.readFileSync(path)
    return new Buffer(file).toString('base64')
  } catch (exception) {
    module.reject(exception)
  }
}

const temp = path.join(path.dirname(fs.realpathSync(__filename)), './tmp')

const generatePDF = (html, fileName) => {
  try {
    pdf.create(html).toFile(`${temp}/${fileName}`, (error, response) => {
      if (error) {
        module.reject(error)
      } else {
        console.log(response)
        module.resolve({ fileName, base64: getBase64String(response.filename) })
      }
    })
  } catch (exception) {
    module.reject(exception)
  }
}

const getComponentAsHTML = (component, props) => {
  try {
    return ReactDOMServer.renderToStaticMarkup(component(props))
  } catch (exception) {
    module.reject(exception)
  }
}

const handler = ({ component, props, fileName }, promise) => {
  module = promise
  const html = getComponentAsHTML(component, props)
  console.log(html)
  if (html && fileName) generatePDF(html, fileName)
}

export const generateComponentAsPDF = (options) => {
  return new Promise((resolve, reject) => {
    return handler(options, { resolve, reject })
  })
}
