import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
  JSONSchemaInput,
  SerializedRenderResult
} from 'quicktype-core'

export function writeQuicktypeResult(quicktypeResult: any, lang: string, filePath: string): void {
  const disableRules = `
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
`

  const folderPath = dirname(filePath)

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }

  writeFileSync(
    filePath,
    [...(lang === 'typescript' ? [disableRules] : []), ...quicktypeResult.lines].join('\n'),
    null
  )
}

export async function quicktypeJSON(
  targetLanguage: string,
  typeName: string,
  jsonStringArray: string[]
): Promise<SerializedRenderResult> {
  const jsonInput = jsonInputForTargetLanguage(targetLanguage)

  // We could add multiple samples for the same desired
  // type, or many sources for other types. Here we're
  // just making one type from one piece of sample JSON.
  await jsonInput.addSource({
    name: typeName,
    samples: jsonStringArray
  })

  const inputData = new InputData()
  inputData.addInput(jsonInput)

  return await quicktype({
    inputData,
    lang: targetLanguage,
    combineClasses: false,
    inferEnums: false,
    allPropertiesOptional: false
  })
}

export interface WriteTypeForTableOptions {
  data: unknown[]
  typeName: string
  filePath: string
  lang?: string
}

export async function writeTypeForTable({
  data,
  typeName,
  filePath,
  lang = 'typescript'
}: WriteTypeForTableOptions): Promise<SerializedRenderResult | Promise<null>> {
  let jsonData
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error('No records in Table.')
    }

    jsonData = data.map(d => JSON.stringify(d))
  } else {
    jsonData = [JSON.stringify(data)]
  }

  const result = await quicktypeJSON(lang, typeName, jsonData)

  writeQuicktypeResult(result, lang, filePath)

  return result
}

export async function quicktypeJSONSchema(
  targetLanguage: string,
  jsonSchemas: { jsonSchemaString: string; typeName: string }[]
): Promise<SerializedRenderResult> {
  const schemaInput = new JSONSchemaInput(undefined)

  // We could add multiple schemas for multiple types,
  // but here we're just making one type from JSON schema.
  await Promise.all(
    jsonSchemas.map(s => schemaInput.addSource({ name: s.typeName, schema: s.jsonSchemaString }))
  )

  const inputData = new InputData()
  inputData.addInput(schemaInput)

  return await quicktype({
    inputData,
    lang: targetLanguage,
    combineClasses: true
  })
}

export interface JsonSchemaInput {
  typeName: string
  inputFile: string
}

export interface WriteTypeFromJsonSchemaOptions {
  typeInputs: JsonSchemaInput[]
  outputFile: string
  lang?: 'schema' | 'typescript'
}

export async function writeTypeFromJsonSchema({
  typeInputs,
  outputFile,
  lang = 'typescript'
}: WriteTypeFromJsonSchemaOptions): Promise<void> {
  const jsonSchemas = typeInputs.map(({ inputFile, typeName }) => ({
    jsonSchemaString: readFileSync(inputFile).toString(),
    typeName
  }))

  const result = await quicktypeJSONSchema(lang, jsonSchemas)

  writeQuicktypeResult(result, lang, outputFile)
}
