import test from 'tape-promise/tape'
import elasticsearch from 'elasticsearch'

const client = new elasticsearch.Client({
  host: 'elastic:9200',
  // log: 'trace',
})

function delay (time) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve()
    }, time)
  })
}

test('Ensure promises work', (assert) => {
  return delay(100).then(_ => {
    assert.true(true)
  })
})

test('Elasticsearch query.', (assert) => {
  const expectedKeys = [
    'AC_UK_ctrls',
    'AC',
    'AC_SWE_cases',
    'qual',
    'AC_ctrls',
    'AC_FIN_cases',
    'pos',
    'rsid',
    'ref',
    'AF',
    'xpos',
    'AC_UK_cases',
    'AC_SWE_ctrls',
    'AC_FIN_ctrls',
    'chrom',
    'alt',
    'AC_cases',
    'filters',
    'variantId'
  ]
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    body: {
      query: {
        match: {
          variantId: '1-27660495-G-T',
        },
      },
    },
  }).then(response => {
    assert.equal(1, response.hits.hits.length)
    const variant = response.hits.hits[0]._source
    // assert.deepEqual(expectedKeys, Object.keys(variant))
    assert.equal('1-27660495-G-T', variant.variantId)
  })
  assert.end()
})

test('Elasticsearch query, return select fields.', (assert) => {
  const fields = [
    'AC_UK_ctrls',
    'filters',
    'variantId'
  ]
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    _source: fields,
    body: {
      query: {
        match: {
          variantId: '1-27660495-G-T',
        },
      },
    },
  }).then(response => {
    const variant = response.hits.hits[0]._source
    assert.deepEqual([
      'AC_UK_ctrls',
      'variantId',
      'filters',
    ], Object.keys(variant))
  })
  assert.end()
})

test('Elasticsearch filter.', (assert) => {
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    body: {
      query: {
        filtered: {
          query: {
            match: {
              variantId: '1-27660495-G-T',
            }
          }
        }
      }
    }
  }).then(response => {
    const variant = response.hits.hits[0]._source
    assert.equal('1-27660495-G-T', variant.variantId)
  })
  assert.end()
})

test('Count documents in an index.', (assert) => {
  client.count({
    index: 'schizophrenia'
  }).then(response => {
    assert.equal(1180240, response.count)
  })
  assert.end()
})

test('Count documents matching a query.', (assert) => {
  client.count({
    index: 'schizophrenia',
    type: 'variant',
    body: {
      query: {
        match: {
          variantId: '1-27660495-G-T',
        },
      },
    },
  }).then(response => assert.equal(1, response.count))
  assert.end()
})

test('Create as a typed json document to an index.', (assert) => {
  client.create({
    index: 'myindex',
    type: 'mytype',
    id: '12',
    body: {
      title: 'Test 1',
      tags: ['y', 'z'],
      published: true,
      published_at: '2013-01-01',
      counter: 1
    }
  }).then(response => {
    response._version = null
    assert.deepEqual({
      _index: 'myindex',
      _type: 'mytype',
      _id: '12',
      _version: null,
      result: 'created',
      _shards: { total: 2, successful: 1, failed: 0 },
      created: true,
    }, response)
    client.delete({
      index: 'myindex',
      type: 'mytype',
      id: '12'
    }).then(response => {
      response._version = null
      assert.deepEqual({
        found: true,
        _index: 'myindex',
        _type: 'mytype',
        _id: '12',
        _version: null,
        result: 'deleted',
        _shards: { total: 2, successful: 1, failed: 0 }
      }, response)
    })
  })
  assert.end()
})

test('Delete by query', (assert) => {
  client.create({
    index: 'myindex',
    type: 'mytype',
    body: {
      title: 'Test 1',
      tags: ['y', 'z'],
      published: false,
      published_at: '2013-01-01',
      counter: 1
    }
  }).then(response => {
    client.deleteByQuery({
      index: 'myindex',
      body: {
        query: {
          term: { published: false }
        }
      }
    }).then(response => assert.equal(1, response.deleted))
  })
  assert.end()
})

test('Document exists.', (assert) => {
  client.exists({
    index: 'schizophrenia',
    type: 'variant',
    id: 'AV4FnrIBzOgwhHmBvyB-'
  }).then(response => assert.true(response))
  assert.end()
})

test('Return variants in interval.', (assert) => {
  const fields = [
    'pos',
    'ref',
    'xpos',
    'chrom',
    'alt',
    'variantId'
  ]
  const expectedVariantsXpos = [
    1027660495,
    1027660630,
    1027674293,
    1027674318,
    1027676233,
    1027676879,
    1027677350,
    1027679806,
    1027679867,
    1027682552,
    1027682962,
    1027683127,
    1027683127,
    1027683128,
    1027683180,
    1027683605,
    1027683913,
    1027684002,
    1027684948,
    1027685024,
  ]
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    _source: fields,
    size: 20,
  }).then(response => {
    const first20 = response.hits.hits.map(v => v._source.xpos)
    // assert.deepEqual(first20, expectedVariantsXpos)
  })
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    size: 61,
    _source: fields,
    body: {
      query: {
        range: {
          xpos: {
            gte: 1027679806,
            lte: 1027684948,
          }
        },
      },
    },
  }).then(response => {
    assert.equal(61, response.hits.total)
  })
  assert.end()
})

test('Look up variants by gene id', (assert) => {
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    size: 1000,
    body: {
      query: {
        match: {
          geneIds: 'ENSG00000145216',
        },
      },
    },
  }).then(response => {
    const variant = response.hits.hits[0]
    assert.equal(response.hits.hits.length, 295)
  })

  assert.end()
})

test('Aggregate variants by gene.', (assert) => {
  client.search({
    index: 'schizophrenia',
    type: 'variant',
    size: 3,
    // aggs: {
    //   countsPerGene: {
    //     terms: {
    //       field: 'mainTranscriptCategory'
    //     }
    //   }
    // },
    _source: ['mainTranscriptCategory']
  }).then(response => {
    console.log(response)
  })

  assert.end()
})

