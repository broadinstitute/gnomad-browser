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

const gqlFetch = require('graphql-fetch')

const apiUrl = process.env.GNOMAD_API_URL || 'https://gnomad.broadinstitute.org/api'

const genes = fs
  .readFileSync(0, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)

console.log(`Loading ${genes.length} genes`)

const fetchGene = async geneIdOrName => {
  console.log(`Fetching ${geneIdOrName}`)

  const argument = geneIdOrName.startsWith('ENSG')
    ? `gene_id: "${geneIdOrName}"`
    : `gene_name: "${geneIdOrName}"`

  const gnomadCoverageQuery = `{
    gene(${argument}) {
      composite_transcript {
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
  }
  `

  const exacCoverageQuery = `{
    gene(${argument}) {
      composite_transcript {
        exome_coverage(dataset: exac) {
          pos
          mean
        }
        genome_coverage(dataset: exac) {
          pos
          mean
        }
      }
    }
  }
  `

  const start = Date.now()

  try {
    const response = await gqlFetch(apiUrl)(gnomadCoverageQuery)
    if (response.errors) {
      console.error(`Error fetching gnomAD coverage for ${geneIdOrName}`)
      console.error(response.errors)
    }
  } catch (error) {
    console.error(`Failed to fetch gnomAD coverage for ${geneIdOrName}`)
    console.error(error)
  }

  try {
    const response = await gqlFetch(apiUrl)(exacCoverageQuery)
    if (response.errors) {
      console.error(`Error fetching ExAC coverage for ${geneIdOrName}`)
      console.error(response.errors)
    }
  } catch (error) {
    console.error(`Failed to fetch ExAC coverage for ${geneIdOrName}`)
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
