import Ajv from 'ajv'
import * as fs from 'fs'
import { vaShaper } from '../src/queries/helpers/va-shaper'

// vaShaper

const elasticData = JSON.parse(fs.readFileSync('./data/elastic/1-55051215-G-GA.json', 'utf8'))
const restData = JSON.parse(fs.readFileSync('./data/rest/1-55051215-G-GA.json', 'utf8'))
const jsonSchema = JSON.parse(fs.readFileSync('./data/schema/va_schema.json', 'utf8'))

const ajv = new Ajv({ strict: false })
const validate = ajv.compile(jsonSchema)

test('validate restData against jsonSchema', () => {
  const data = { ...restData[0] }
  // console.log(data)
  const valid = validate(data.gks_va_freq)
  if (!valid) console.log(validate.errors)
  expect(valid).toBe(true)
})

test('validate shaped es data against jsonSchema', () => {
  const data = vaShaper(elasticData)
  console.log(data)
  const valid = validate(data.va)
  if (!valid) console.log(validate.errors)
  expect(valid).toBe(true)
})
