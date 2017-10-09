import fs from 'fs'
import path from 'path'

export function writefetched(data, filename) {
  const fullPath = path.resolve('../../resources', filename)
  fs.writeFile(fullPath, JSON.stringify(data))
  console.log('wrote', fullPath)
}
