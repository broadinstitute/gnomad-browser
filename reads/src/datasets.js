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

const shortTandemRepeatDatasets = {
  gnomad_r3: {
    dbPath: '/readviz/datasets/gnomad_r3_short_tandem_repeats/str_reads.db',
    publicPath: '/reads/gnomad_r3/short_tandem_repeats',
  },
  gnomad_r4: {
    dbPath: './v4_str_reads.db',
    publicPath: 'https://storage.googleapis.com/gnomad-str-public/release_2024_07/readviz_v2',
  },
}

module.exports = { variantDatasets, shortTandemRepeatDatasets }
