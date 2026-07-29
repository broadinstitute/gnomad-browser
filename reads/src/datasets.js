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

// Names the release explicitly rather than reusing the previous release's str_reads.db, so that
// the new DB is added alongside the old one on the /readviz disk instead of overwriting it. That
// keeps the previous release servable and makes rolling back a code revert rather than a data copy.
const SHORT_TANDEM_REPEAT_READS_DB_PATH =
  '/readviz/datasets/gnomad_r4_short_tandem_repeats/str_reads_2026_07_20.db'

const shortTandemRepeatDatasets = {
  gnomad_r3: {
    dbPath: SHORT_TANDEM_REPEAT_READS_DB_PATH,
    publicPath: 'https://storage.googleapis.com/gnomad-str-public/release_2024_07/readviz_v2',
  },
  gnomad_r4: {
    dbPath: SHORT_TANDEM_REPEAT_READS_DB_PATH,
    publicPath: 'https://storage.googleapis.com/gnomad-str-public/release_2024_07/readviz_v2',
  },
}

module.exports = { variantDatasets, shortTandemRepeatDatasets }
