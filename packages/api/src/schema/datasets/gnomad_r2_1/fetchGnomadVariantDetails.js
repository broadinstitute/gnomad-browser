const formatHistogram = histogramData => ({
  bin_edges: histogramData.bin_edges.split('|').map(s => Number(s)),
  bin_freq: histogramData.bin_freq.split('|').map(s => Number(s)),
  n_larger: histogramData.n_larger,
  n_smaller: histogramData.n_smaller,
})

const POPULATIONS = ['afr', 'amr', 'asj', 'eas', 'fin', 'nfe', 'oth', 'sas']

const SUBPOPULATIONS = {
  afr: ['female', 'male'],
  amr: ['female', 'male'],
  asj: ['female', 'male'],
  eas: ['female', 'male', 'jpn', 'kor', 'oea'],
  fin: ['female', 'male'],
  nfe: ['female', 'male', 'bgr', 'est', 'nwe', 'onf', 'seu', 'swe'],
  oth: ['female', 'male'],
  sas: ['female', 'male'],
}

const formatPopulations = variantData =>
  POPULATIONS.map(popId => ({
    id: popId.toUpperCase(),
    ac: (variantData.AC_adj[popId] || {}).total || 0,
    an: (variantData.AN_adj[popId] || {}).total || 0,
    ac_hemi: variantData.nonpar ? (variantData.AC_adj[popId] || {}).male || 0 : 0,
    ac_hom: (variantData.nhomalt_adj[popId] || {}).total || 0,
    subpopulations: SUBPOPULATIONS[popId].map(subPopId => ({
      id: subPopId.toUpperCase(),
      ac: (variantData.AC_adj[popId] || {})[subPopId] || 0,
      an: (variantData.AN_adj[popId] || {})[subPopId] || 0,
      ac_hom: (variantData.nhomalt_adj[popId] || {})[subPopId] || 0,
    })),
  }))

const fetchGnomadVariantData = async (ctx, variantId, subset) => {
  const requests = [
    { index: 'gnomad_exomes_2_1', subset },
    // All genome samples are non_cancer, so separate non-cancer numbers are not stored
    { index: 'gnomad_genomes_2_1', subset: subset === 'non_cancer' ? 'gnomad' : subset },
  ]

  const [exomeData, genomeData] = await Promise.all(
    requests.map(({ index, subset: requestSubset }) =>
      ctx.database.elastic
        .search({
          index,
          type: 'variant',
          _source: [
            requestSubset,
            'allele_info',
            'alt',
            'chrom',
            'dp_hist_all',
            'dp_hist_alt',
            'filters',
            'flags',
            'gnomad_age_hist_het',
            'gnomad_age_hist_hom',
            'gq_hist_all',
            'gq_hist_alt',
            'nonpar',
            'pos',
            'qual',
            'ref',
            'rsid',
            'sortedTranscriptConsequences',
            'variant_id',
            'xpos',
          ],
          body: {
            query: {
              bool: {
                filter: [
                  { term: { variant_id: variantId } },
                  { range: { [`${requestSubset}.AC_raw`]: { gt: 0 } } },
                ],
              },
            },
          },
          size: 1,
        })
        .then(response => response.hits.hits[0])
        // eslint-disable-next-line no-underscore-dangle
        .then(doc => (doc ? { ...doc._source, ...doc._source[requestSubset] } : undefined))
    )
  )

  return {
    exomeData,
    genomeData,
  }
}

const fetchColocatedVariants = async (ctx, variantId, subset) => {
  const parts = variantId.split('-')
  const chrom = parts[0]
  const pos = Number(parts[1])

  const requests = [
    { index: 'gnomad_exomes_2_1', subset },
    // All genome samples are non_cancer, so separate non-cancer numbers are not stored
    { index: 'gnomad_genomes_2_1', subset: subset === 'non_cancer' ? 'gnomad' : subset },
  ]

  const [exomeResponse, genomeResponse] = await Promise.all(
    requests.map(({ index, subset: requestSubset }) =>
      ctx.database.elastic.search({
        index,
        type: 'variant',
        _source: ['variant_id'],
        body: {
          query: {
            bool: {
              filter: [
                { term: { chrom } },
                { term: { pos } },
                { range: { [`${requestSubset}.AC_raw`]: { gt: 0 } } },
              ],
            },
          },
        },
      })
    )
  )

  /* eslint-disable no-underscore-dangle */
  const exomeVariants = exomeResponse.hits.hits.map(doc => doc._source.variant_id)
  const genomeVariants = genomeResponse.hits.hits.map(doc => doc._source.variant_id)
  /* eslint-enable no-underscore-dangle */

  const combinedVariants = exomeVariants.concat(genomeVariants)

  return combinedVariants
    .filter(otherVariantId => otherVariantId !== variantId)
    .sort()
    .filter(
      (otherVariantId, index, allOtherVariantIds) =>
        otherVariantId !== allOtherVariantIds[index + 1]
    )
}

const fetchGnomadVariantDetails = async (ctx, variantId, subset) => {
  const [{ exomeData, genomeData }, colocatedVariants] = await Promise.all([
    fetchGnomadVariantData(ctx, variantId, subset),
    fetchColocatedVariants(ctx, variantId, subset),
  ])

  if (!exomeData && !genomeData) {
    throw Error('Variant not found')
  }

  const sharedData = exomeData || genomeData

  const sharedVariantFields = {
    alt: sharedData.alt,
    chrom: sharedData.chrom,
    pos: sharedData.pos,
    ref: sharedData.ref,
    variantId: sharedData.variant_id,
    xpos: sharedData.xpos,
  }

  return {
    gqlType: 'GnomadVariantDetails',
    // variant interface fields
    ...sharedVariantFields,
    // gnomAD specific fields
    age_distribution: {
      het: formatHistogram(sharedData.gnomad_age_hist_het),
      hom: formatHistogram(sharedData.gnomad_age_hist_hom),
    },
    colocatedVariants,
    exome: exomeData
      ? {
          // Include variant fields so that the reads data resolver can access them.
          ...sharedVariantFields,
          ac: exomeData.AC_adj.total,
          an: exomeData.AN_adj.total,
          ac_hemi: exomeData.nonpar ? exomeData.AC_adj.male : 0,
          ac_hom: exomeData.nhomalt_adj.total,
          faf95: exomeData.faf95_adj.total,
          faf99: exomeData.faf99_adj.total,
          filters: exomeData.filters,
          populations: formatPopulations(exomeData),
          qualityMetrics: {
            genotypeDepth: {
              all: formatHistogram(exomeData.dp_hist_all),
              alt: formatHistogram(exomeData.dp_hist_alt),
            },
            genotypeQuality: {
              all: formatHistogram(exomeData.gq_hist_all),
              alt: formatHistogram(exomeData.gq_hist_alt),
            },
            siteQualityMetrics: {
              ...exomeData.allele_info,
              SiteQuality: exomeData.qual,
            },
          },
        }
      : null,
    flags: ['lcr', 'segdup', 'lc_lof', 'lof_flag'].filter(flag => sharedData.flags[flag]),
    genome: genomeData
      ? {
          // Include variant fields so that the reads data resolver can access them.
          ...sharedVariantFields,
          ac: genomeData.AC_adj.total,
          an: genomeData.AN_adj.total,
          ac_hemi: genomeData.nonpar ? genomeData.AC_adj.male : 0,
          ac_hom: genomeData.nhomalt_adj.total,
          faf95: genomeData.faf95_adj.total,
          faf99: genomeData.faf99_adj.total,
          filters: genomeData.filters,
          populations: formatPopulations(genomeData),
          qualityMetrics: {
            genotypeDepth: {
              all: formatHistogram(genomeData.dp_hist_all),
              alt: formatHistogram(genomeData.dp_hist_alt),
            },
            genotypeQuality: {
              all: formatHistogram(genomeData.gq_hist_all),
              alt: formatHistogram(genomeData.gq_hist_alt),
            },
            siteQualityMetrics: {
              ...genomeData.allele_info,
              SiteQuality: genomeData.qual,
            },
          },
        }
      : null,
    rsid: sharedData.rsid,
    sortedTranscriptConsequences: sharedData.sortedTranscriptConsequences || [],
  }
}

export default fetchGnomadVariantDetails
