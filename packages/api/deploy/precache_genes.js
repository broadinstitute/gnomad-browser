import fetch from 'graphql-fetch'
import fs from 'fs'
import { List, Range } from 'immutable'

const API_URL = process.env.GNOMAD_API_URL
const GENE_FILE_PATH = process.argv[2]
const NUMBER_OF_CLIENTS = process.argv[3]

const genes = List(JSON.parse(fs.readFileSync(GENE_FILE_PATH, 'utf8')))

// const genes = allGenes.slice(allGenes.indexOf('ZNF528') - 100)

console.log(`Loading ${genes.size} genes`)

const variantFilter = 'all'

const exacVariant = `
  exacVariants {
    variant_id
    rsid
    pos
    xpos
    hgvsc
    hgvsp
    allele_count
    allele_freq
    allele_num
    filters
    hom_count
    consequence
    lof
  }
`

const variantQuery = (includeExac = true) => `
  gnomadExomeVariants(category: "${variantFilter}") {
    variant_id
    rsid
    pos
    xpos
    hgvsc
    hgvsp
    allele_count
    allele_freq
    allele_num
    filters
    hom_count
    consequence
    lof
    lcr
    segdup
  }
  gnomadGenomeVariants(category: "${variantFilter}") {
    variant_id
    rsid
    pos
    xpos
    hgvsc
    hgvsp
    allele_count
    allele_freq
    allele_num
    filters
    hom_count
    consequence
    lof
    lcr
    segdup
  }
  ${includeExac ? exacVariant : ''}
`

export const fetchData = (geneName, includeExac = true, url = API_URL) => {
  const argument = geneName.startsWith('ENSG') ? `gene_id: "${geneName}"` :
    `gene_name: "${geneName}"`

  const exacCoverageQuery = `exacv1_coverage {
    pos
    mean
  }`

  const query = `{
    gene(${argument}) {
      ${variantQuery(includeExac)}
      transcript {
        genome_coverage {
          pos
          mean
        }
        exome_coverage {
          pos
          mean
        }
        ${includeExac ? exacCoverageQuery : ''}
      }
    }
  }
  `

  return new Promise((resolve, reject) => {
    fetch(url)(query)
      .then(data => resolve(data.data.gene))
      .catch((error) => {
        reject(error)
      })
  })
}

const testGenes = List([
  'PCSK9',
  'PPARA',
  'MYH7',
  'DMD',
])

const variantDataSets = [
  'gnomadExomeVariants',
  'gnomadGenomeVariants',
  'exacVariants',
]

function fetchGeneList(genes = testGenes, includeExac = true) {
  if (genes.size === 0) {
    console.log('done')
    return
  }
  const gene = genes.first()
  const start = new Date().getTime()

  fetchData(gene, includeExac)
    .then((response) => {
      const variantCounts = variantDataSets.map((dataset) => {
        return response[dataset].length
      })
      const coverageCounts = Object.keys(response.transcript).map((dataset) => {
        return response.transcript[dataset].length
      })
      const end = new Date().getTime()
      const time = end - start
      console.log([end, genes.size, gene, ...variantCounts, ...coverageCounts, time].join(','))
      fetchGeneList(genes.rest())
    })
    .catch((error) => {
      console.log([gene, error].join(','))
      fetchGeneList(genes.rest())
    })
}

export function fetchTitan () {
  fetchData('TTN', false)
    .then(() => fetchData('TTN')
      .then(() => {
        fetchData('TTN')
        console.log('done fetching titan')
      })
  )
}

function fetchConcurrent(genes, numberOfClients = 1) {
  function splitIntoGroups(list, chunkSize) {
    return Range(0, list.count(), chunkSize)
      .map(chunkStart => list.slice(chunkStart, chunkStart + chunkSize))
  }

  const chunkSize = genes.size / numberOfClients

  splitIntoGroups(genes, chunkSize)
    .forEach((group) => {
      return new Promise(() => {
        fetchGeneList(group)
      })
    })
}

fetchConcurrent(genes, NUMBER_OF_CLIENTS)
