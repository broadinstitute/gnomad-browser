const variantDatasets = {
  gnomad_r4: {
    exomes: {
      readsDirectory: '/readviz/datasets/gnomad_r4',
      publicPath: '/reads/gnomad_r4/exomes',
      meta: 's800_gs800_gn910',
    },
    genomes: {
      readsDirectory: '/readviz/datasets/gnomad_r3_1',
      publicPath: '/reads/gnomad_r3/genomes',
      meta: 's42811_gs50_gn857',
    },
  },
  gnomad_r3: {
    genomes: {
      readsDirectory: '/readviz/datasets/gnomad_r3_1',
      publicPath: '/reads/gnomad_r3/genomes',
      meta: 's42811_gs50_gn857',
    },
  },
  gnomad_r2: {
    exomes: {
      readsDirectory: '/readviz/datasets/gnomad_r2/combined_bams_exomes/combined_bams',
      publicPath: '/reads/gnomad_r2/exomes',
      legacyResolver: true,
    },
    genomes: {
      readsDirectory: '/readviz/datasets/gnomad_r2/combined_bams_genomes/combined_bams',
      publicPath: '/reads/gnomad_r2/genomes',
      legacyResolver: true,
    },
  },
  exac: {
    exomes: {
      readsDirectory: '/readviz/datasets/exac/combined_bams_v3',
      publicPath: '/reads/exac/exomes',
      legacyResolver: true,
    },
  },
}

// Downloaded to the container's writable filesystem at startup. Override with STR_READS_DB_URL so
// that a data-only release does not require a code change.
const SHORT_TANDEM_REPEAT_READS_DB_URL =
  process.env.STR_READS_DB_URL ||
  'https://storage.googleapis.com/gnomad-str-public/release_2026_07/reads_db/str_reads_2026_07_20.db'

// Set STR_READS_DB_PATH to serve a DB already on disk and skip the download entirely (local dev).
const SHORT_TANDEM_REPEAT_READS_DB_PATH = process.env.STR_READS_DB_PATH || null

const shortTandemRepeatDatasets = {
  gnomad_r3: {
    dbPath: SHORT_TANDEM_REPEAT_READS_DB_PATH,
    dbUrl: SHORT_TANDEM_REPEAT_READS_DB_URL,
    publicPath: 'https://storage.googleapis.com/gnomad-str-public/release_2024_07/readviz_v2',
  },
  gnomad_r4: {
    dbPath: SHORT_TANDEM_REPEAT_READS_DB_PATH,
    dbUrl: SHORT_TANDEM_REPEAT_READS_DB_URL,
    publicPath: 'https://storage.googleapis.com/gnomad-str-public/release_2024_07/readviz_v2',
  },
}

module.exports = { variantDatasets, shortTandemRepeatDatasets }
