import elasticsearch from 'elasticsearch'
import csv from 'csvtojson'

export function loadCsvToElastic({
  address,
  dropPreviousIndex,
  filePath,
  headers,
  delimiter,
  indexName,
  typeName,
}) {
  const client = new elasticsearch.Client({ host: address })
  if (dropPreviousIndex) {
    client.indices.delete({
      index: indexName,
    })
  }
  console.log(filePath)
  csv({
    delimiter,
    checkType: true,
    headers,
  }).fromFile(filePath).on('end_parsed', (json) => {
    console.log(json)
    const data = json.reduce((acc, doc) => {
      return [
        ...acc,
        {
          index: {
            _index: indexName,
            _type: typeName,
          },
        },
        doc,
      ]
    }, [])
    client.bulk({ body: data })
      .then(response => console.log(response))
      .catch(error => console.log(error))
  }).on('error', error => console.log(error))
}

export function loadJsonArrayToElastic({
  address,
  dropPreviousIndex,
  indexName,
  typeName,
  jsonArray
}) {
  const client = new elasticsearch.Client({ host: address })
  if (dropPreviousIndex) {
    client.indices.delete({
      index: indexName,
    })
  }
  const data = jsonArray.reduce((acc, doc) => {
    return [
      ...acc,
      {
        index: {
          _index: indexName,
          _type: typeName,
        },
      },
      doc,
    ]
  }, [])
  client.bulk({ body: data })
    .then(response => console.log(response))
    .catch(error => console.log(error))
}
