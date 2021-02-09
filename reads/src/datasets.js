const datasets = {
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

module.exports = datasets
