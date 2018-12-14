import elasticsearch from 'elasticsearch'

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
