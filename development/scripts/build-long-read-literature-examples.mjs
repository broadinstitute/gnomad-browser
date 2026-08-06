#!/usr/bin/env node
// Builds browser/src/data/longReadLiteratureExamples.json from the LR literature
// truth-set TSV, hand-verified archetype exemplars, and a local PDF corpus.
// Source paths are supplied explicitly because the source corpus is not part of this repo.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..')
const DEFAULT_PUBLIC_PAPERS_DIR = path.join(REPO_ROOT, 'browser/public/papers')
const DEFAULT_OUT_FILE = path.join(REPO_ROOT, 'browser/src/data/longReadLiteratureExamples.json')

const DEFAULT_API_URL = 'http://localhost:8010/api/'
const Y1_MAX_WINDOW = 100_000
const MIN_WINDOW = 20_000

const USAGE = `Usage:
  node development/scripts/build-long-read-literature-examples.mjs \\
    --truth-tsv <path> --exemplar-tsv <path> --papers-dir <path> [options]

Required inputs (CLI flags take precedence over environment variables):
  --truth-tsv       LR truth-set TSV (LR_LITERATURE_TRUTH_TSV)
  --exemplar-tsv    Hand-verified exemplar TSV (LR_LITERATURE_EXEMPLAR_TSV)
  --papers-dir      Local PDF corpus root (LR_LITERATURE_PAPERS_DIR)

Options:
  --api-url             Gene GraphQL endpoint (LR_LITERATURE_API_URL;
                        default: ${DEFAULT_API_URL})
  --out-file            Generated JSON path (LR_LITERATURE_OUT_FILE;
                        default: browser/src/data/longReadLiteratureExamples.json)
  --public-papers-dir   Destination for generated PDF symlinks
                        (LR_LITERATURE_PUBLIC_PAPERS_DIR;
                        default: browser/public/papers)
  --help                Show this message

The generated JSON is committed, but the private inputs and browser/public/papers
are not required for ordinary browser builds.`

function parseArgs(argv) {
  const values = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') return { help: true }
    if (!arg.startsWith('--')) throw new Error(`unexpected argument: ${arg}`)
    const name = arg.slice(2)
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${arg}`)
    if (values[name] !== undefined) throw new Error(`duplicate option: ${arg}`)
    values[name] = value
    i += 1
  }

  const config = {
    truthTsv: values['truth-tsv'] || process.env.LR_LITERATURE_TRUTH_TSV,
    exemplarTsv: values['exemplar-tsv'] || process.env.LR_LITERATURE_EXEMPLAR_TSV,
    papersDir: values['papers-dir'] || process.env.LR_LITERATURE_PAPERS_DIR,
    apiUrl: values['api-url'] || process.env.LR_LITERATURE_API_URL || DEFAULT_API_URL,
    outFile: values['out-file'] || process.env.LR_LITERATURE_OUT_FILE || DEFAULT_OUT_FILE,
    publicPapersDir:
      values['public-papers-dir'] ||
      process.env.LR_LITERATURE_PUBLIC_PAPERS_DIR ||
      DEFAULT_PUBLIC_PAPERS_DIR,
  }

  const knownOptions = new Set([
    'truth-tsv',
    'exemplar-tsv',
    'papers-dir',
    'api-url',
    'out-file',
    'public-papers-dir',
  ])
  const unknown = Object.keys(values).find((name) => !knownOptions.has(name))
  if (unknown) throw new Error(`unknown option: --${unknown}`)

  for (const [label, value] of [
    ['--truth-tsv', config.truthTsv],
    ['--exemplar-tsv', config.exemplarTsv],
    ['--papers-dir', config.papersDir],
  ]) {
    if (!value) throw new Error(`missing required input ${label}`)
  }

  config.truthTsv = path.resolve(config.truthTsv)
  config.exemplarTsv = path.resolve(config.exemplarTsv)
  config.papersDir = path.resolve(config.papersDir)
  config.outFile = path.resolve(config.outFile)
  config.publicPapersDir = path.resolve(config.publicPapersDir)

  assertFile(config.truthTsv, '--truth-tsv')
  assertFile(config.exemplarTsv, '--exemplar-tsv')
  assertDirectory(config.papersDir, '--papers-dir')
  return config
}

function assertFile(file, option) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    throw new Error(`${option} is not a readable file: ${file}`)
  }
}

function assertDirectory(dir, option) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`${option} is not a readable directory: ${dir}`)
  }
}

function parseTsv(file) {
  const lines = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
  if (lines.length === 0) throw new Error(`TSV is empty: ${file}`)

  const header = lines[0].split('\t')
  return lines.slice(1).map((line) => {
    const cells = line.split('\t')
    const row = {}
    header.forEach((column, i) => {
      row[column] = (cells[i] ?? '').trim()
    })
    return row
  })
}

// Symbols renamed since these papers were curated (HGNC updates).
const GENE_SYMBOL_ALIASES = {
  G6PC: 'G6PC1',
}

// "GCH1" -> GCH1; "PKD1 non-coding" -> PKD1; "CYP21A2 / CYP21A1P" -> CYP21A2.
function extractGeneSymbol(text) {
  if (!text) return null
  const t = text.trim()
  if (!t || /^(N\/A|NONE|UNKNOWN)$/i.test(t)) return null
  const firstChunk = t.split(/\s*(?:\/|,| and | AND |;)\s*/)[0]
  for (const tok of firstChunk.split(/\s+/)) {
    const cleaned = tok.replace(/[().,]/g, '')
    if (!cleaned) continue
    if (/^\d+$/.test(cleaned)) continue
    if (!/[A-Za-z]/.test(cleaned)) continue
    if (cleaned.length > 3 && cleaned === cleaned.toLowerCase()) continue
    if (!/^[A-Za-z][A-Za-z0-9-]{1,14}$/.test(cleaned)) continue
    if (/^[ACGT]{3,}$/i.test(cleaned)) continue
    return GENE_SYMBOL_ALIASES[cleaned] || cleaned
  }
  return null
}

async function fetchGene(symbol, apiUrl) {
  const query = `{ gene(gene_symbol: "${symbol}", reference_genome: GRCh38) { symbol chrom start stop } }`
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.errors?.length) throw new Error(json.errors[0].message || 'GraphQL error')
    return json?.data?.gene ?? null
  } catch (err) {
    console.warn(`gene lookup failed for ${symbol}: ${err.message}`)
    return null
  }
}

function computeWindow(gene) {
  const geneLen = gene.stop - gene.start
  const flank = Math.min(20_000, Math.max(2_000, Math.round(geneLen * 0.1)))
  let start = gene.start - flank
  let stop = gene.stop + flank
  if (stop - start < MIN_WINDOW) {
    const mid = (start + stop) / 2
    start = mid - MIN_WINDOW / 2
    stop = mid + MIN_WINDOW / 2
  }
  let truncated = false
  if (stop - start > Y1_MAX_WINDOW) {
    const mid = (gene.start + gene.stop) / 2
    start = mid - Y1_MAX_WINDOW / 2
    stop = mid + Y1_MAX_WINDOW / 2
    truncated = true
  }
  return {
    chrom: gene.chrom,
    start: Math.max(0, Math.round(start)),
    stop: Math.round(stop),
    truncated,
  }
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function findPdf(title, year, allPdfPaths) {
  const titleWords = normalize(title)
    .split(' ')
    .filter((word) => word.length > 3)
  if (titleWords.length === 0) return null
  let best = null
  let bestScore = 0
  for (const pdfPath of allPdfPaths) {
    const base = path.basename(pdfPath, '.pdf')
    const match = base.match(/(\d{4})\s*-\s*(.+)$/)
    if (!match) continue
    if (year && match[1] !== year) continue
    const fileWords = new Set(
      normalize(match[2])
        .split(' ')
        .filter((word) => word.length > 3)
    )
    let overlap = 0
    for (const word of titleWords) if (fileWords.has(word)) overlap += 1
    const score = overlap / titleWords.length
    if (score > bestScore) {
      bestScore = score
      best = pdfPath
    }
  }
  return bestScore >= 0.5 ? best : null
}

function collectPdfPaths(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectPdfPaths(full))
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) out.push(full)
  }
  return out
}

async function main(config) {
  if (typeof fetch !== 'function') {
    throw new Error('this generator requires Node.js 18 or later (global fetch support)')
  }

  const truthRows = parseTsv(config.truthTsv)
  const exemplarRows = parseTsv(config.exemplarTsv)

  const exemplarByPmid = new Map()
  const exemplarByDoi = new Map()
  for (const ex of exemplarRows) {
    if (ex.PMID) exemplarByPmid.set(ex.PMID, ex)
    if (ex.DOI) exemplarByDoi.set(ex.DOI, ex)
  }

  const allPdfPaths = collectPdfPaths(config.papersDir)
  fs.mkdirSync(config.publicPapersDir, { recursive: true })

  const geneCache = new Map()
  const results = []
  let pdfMatched = 0
  let regionResolved = 0
  let verifiedCount = 0

  for (const row of truthRows) {
    const ref = row.ref
    if (!/^[A-Za-z0-9_-]+$/.test(ref)) {
      throw new Error(`invalid ref for PDF filename: ${JSON.stringify(ref)}`)
    }
    const exemplar = exemplarByPmid.get(row.pmid) || exemplarByDoi.get(row.doi) || null

    // Hand-classified exemplars are more reliable than the original table, so
    // prefer their archetype when the two inputs disagree.
    const exemplarArchetypeCode = exemplar?.archetype?.match(/^A\d+/)?.[0]
    const archetype = exemplarArchetypeCode || row.archetype
    const candidateSymbol =
      extractGeneSymbol(row.curated_gene_locus) || extractGeneSymbol(row.llm_locus)

    let region = null
    let geneSymbol = null
    if (exemplar && exemplar.proposed_display_interval) {
      const match = exemplar.proposed_display_interval.match(/chr(\w+):(\d+)-(\d+)/)
      if (match) {
        region = {
          chrom: match[1],
          start: Number(match[2]),
          stop: Number(match[3]),
          truncated: false,
          verified: true,
        }
        verifiedCount += 1
        geneSymbol = candidateSymbol
      }
    }
    if (!region && candidateSymbol) {
      if (!geneCache.has(candidateSymbol)) {
        geneCache.set(candidateSymbol, await fetchGene(candidateSymbol, config.apiUrl))
      }
      const gene = geneCache.get(candidateSymbol)
      if (gene) {
        region = { ...computeWindow(gene), verified: false }
        geneSymbol = gene.symbol
      }
    }
    if (region) regionResolved += 1

    const pdfPath = findPdf(row.title, row.year, allPdfPaths)
    let pdfUrl = null
    if (pdfPath) {
      pdfMatched += 1
      const dest = path.join(config.publicPapersDir, `${ref}.pdf`)
      fs.rmSync(dest, { force: true })
      fs.symlinkSync(pdfPath, dest)
      pdfUrl = `/papers/${ref}.pdf`
    }

    results.push({
      ref,
      archetype: archetype || null,
      title: row.title,
      year: row.year || null,
      venue: row.venue || null,
      pmid: row.pmid || null,
      doi: row.doi || null,
      geneSymbol,
      variantClass: row.curated_variant_class || row.llm_variant_class || null,
      priorShortReadResult:
        row.llm_prior_sr_result && row.llm_prior_sr_result !== 'N/A'
          ? row.llm_prior_sr_result
          : null,
      populationComparator:
        row.llm_pop_comparator && row.llm_pop_comparator !== 'NONE' ? row.llm_pop_comparator : null,
      whyInTruthSet: row.curated_why_in_truth_set || null,
      region,
      pdfUrl,
    })
  }

  fs.mkdirSync(path.dirname(config.outFile), { recursive: true })
  fs.writeFileSync(config.outFile, `${JSON.stringify(results, null, 2)}\n`)

  console.log(`rows: ${results.length}`)
  console.log(`region resolved: ${regionResolved} (verified: ${verifiedCount})`)
  console.log(`pdf matched: ${pdfMatched}`)
  console.log(`wrote ${config.outFile}`)
}

let config
try {
  config = parseArgs(process.argv.slice(2))
  if (config.help) {
    console.log(USAGE)
  } else {
    await main(config)
  }
} catch (err) {
  console.error(`Error: ${err.message}\n\n${USAGE}`)
  process.exitCode = 1
}
