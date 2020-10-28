const datasets = {
  gnomad_r2_1: {
    exomes: {
      readsDirectory: '/readviz/datasets/gnomad_r2/combined_bams_exomes/combined_bams',
      publicPath: '/reads/gnomad_r2_1/exomes',
    },
    genomes: {
      readsDirectory: '/readviz/datasets/gnomad_r2/combined_bams_genomes/combined_bams',
      publicPath: '/reads/gnomad_r2_1/genomes',
    },
  },
  exac: {
    exomes: {
      readsDirectory: '/readviz/datasets/exac/combined_bams_v3',
      publicPath: '/reads/exac/exomes',
    },
  },
}

export default datasets
