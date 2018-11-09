import fs from 'fs'
import path from 'path'

import fetchData from '../src/GenePage/fetch'

fetchData('MYH7').then(data => {
  fs.writeFileSync(
    path.resolve(__dirname, '../../../resources/1505910855-variantfx-myh7.json'),
    JSON.stringify(data)
  )
})
