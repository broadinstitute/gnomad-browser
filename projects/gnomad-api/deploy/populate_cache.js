#!/usr/bin/env node

/**
  Populate Redis cache by making API requests

  See gene lists in resources folder:
  * 100_slow_genes_171111-163002.json
  * clean_genes_list_171112.json
  * genes.json
  * genes_subset.json
*/

const fs = require('fs')
const process = require('process')

const gqlFetch = require('graphql-fetch')

const apiUrl = process.env.GNOMAD_API_URL || 'https://gnomad.broadinstitute.org/api'

const genes = fs
  .readFileSync(process.argv[2], 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)

console.log(`Loading ${genes.length} genes`)

const fetchGene = async geneIdOrSymbol => {
  console.log(`Fetching ${geneIdOrSymbol}`)

  const argument = geneIdOrSymbol.startsWith('ENSG')
    ? `gene_id: "${geneIdOrSymbol}"`
    : `gene_symbol "${geneIdOrSymbol}"`

  const gnomadCoverageQuery = `{
    gene(${argument}) {
      exome_coverage(dataset: gnomad_r2_1) {
        pos
        mean
      }
      genome_coverage(dataset: gnomad_r2_1) {
        pos
        mean
      }
    }
  }
  `

  const exacCoverageQuery = `{
    gene(${argument}) {
      exome_coverage(dataset: exac) {
        pos
        mean
      }
    }
  }
  `

  const start = Date.now()

  try {
    const response = await gqlFetch(apiUrl)(gnomadCoverageQuery)
    if (response.errors) {
      console.error(`Error fetching gnomAD coverage for ${geneIdOrSymbol}`)
      console.error(response.errors)
    }
  } catch (error) {
    console.error(`Failed to fetch gnomAD coverage for ${geneIdOrSymbol}`)
    console.error(error)
  }

  try {
    const response = await gqlFetch(apiUrl)(exacCoverageQuery)
    if (response.errors) {
      console.error(`Error fetching ExAC coverage for ${geneIdOrSymbol}`)
      console.error(response.errors)
    }
  } catch (error) {
    console.error(`Failed to fetch ExAC coverage for ${geneIdOrSymbol}`)
    console.error(error)
  }

  const end = Date.now()

  console.log(`${end - start} ms`)
}

const main = async () => {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < genes.length; i += 1) {
    await fetchGene(genes[i])
  }
}

main()
