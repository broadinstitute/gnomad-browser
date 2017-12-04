import test from 'tape-promise/tape'
import fetch from 'isomorphic-fetch'

function executeGraphQLQuery(url, query, variables) {
  return fetch(url, {
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json'
    }),
    body: JSON.stringify({
      query,
      variables,
    })
  }).then((response) => {
    if (response.ok) { return response.json() }
    return response.text().then((body) => {
      throw Error(`${response.status} ${response.statusText}\n${body}`)
    })
  })
}

test('Given list of variant ids and arguments, return data for export.', (assert) => {
  const query = `
  query VariantTable(
    $currentGene: String,
    $currentTranscript: String,
    $cursor: String,
    $numberOfVariants: Int,
    $consequence: String,
  ) {
    variantResult: variants(
      geneId: $currentGene,
      size: $numberOfVariants,
      cursor: $cursor,
    ) {
      count
      cursor
      variants {
        id: variantId
        variantId,
        totalCounts {
          alleleCount: AC
          alleleFrequency: AF
          homozygotes: Hom
          alleleNumber: AN
          hemizygotes: Hemi
        }
        flags {
          segdup
          lcr
        }
        mainTranscript {
          majorConsequence(string: $consequence)
          hgvsc
          hgvsp
          lof
          transcriptId
        }
        sortedTranscriptConsequences(
          transcriptId: $currentTranscript
        ) {
          majorConsequence: major_consequence
          hgvsc
          hgvsp
          lof
          transcriptId: transcript_id
        }
      }
    }
  }
  `
  const variables = {
    currentGene: 'ENSG00000198947',
    currentTranscript: 'ENST00000343523',
    numberOfVariants: 200
  }

  executeGraphQLQuery('http://localhost:8007', query, variables).then((json) => {
    console.log(json)
  })

  assert.end()
})
