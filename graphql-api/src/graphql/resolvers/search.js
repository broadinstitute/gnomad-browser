const {
  isRegionId,
  normalizeRegionId,
  isVariantId,
  normalizeVariantId,
  isRsId,
} = require('@gnomad/identifiers')

const { UserVisibleError } = require('../errors')

const DATASET_LABELS = {
  gnomad_r3: 'gnomAD v3',
  gnomad_r2_1: 'gnomAD v2',
  gnomad_r2_1_controls: 'gnomAD v2',
  gnomad_r2_1_non_neuro: 'gnomAD v2',
  gnomad_r2_1_non_cancer: 'gnomAD v2',
  gnomad_r2_1_non_topmed: 'gnomAD v2',
  exac: 'ExAC',
}

const resolveSearchResults = (obj, args, ctx) => {
  const { query, dataset } = args

  if (dataset !== 'gnomad_r2_1' && dataset !== 'gnomad_r3') {
    throw new UserVisibleError(`Search is not supported for dataset "${DATASET_LABELS[dataset]}"`)
  }

  if (isVariantId(query)) {
    const variantId = normalizeVariantId(query)
    return [
      {
        label: variantId,
        url: `/variant/${variantId}?dataset=${dataset}`,
      },
    ]
  }

  if (isRsId(query)) {
    const rsId = query
    return [
      {
        label: rsId,
        url: `/variant/${rsId}?dataset=${dataset}`,
      },
    ]
  }

  if (isRegionId(query)) {
    const regionId = normalizeRegionId(query)
    return [
      {
        label: regionId,
        url: `/region/${regionId}?dataset=${dataset}`,
      },
    ]
  }

  const upperCaseQuery = query.toUpperCase()

  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const geneId = upperCaseQuery
    return [
      {
        label: geneId,
        url: `/gene/${geneId}?dataset=${dataset}`,
      },
    ]
  }

  if (/^ENST\d{11}$/.test(upperCaseQuery)) {
    const transcriptId = upperCaseQuery
    return [
      {
        label: transcriptId,
        url: `/transcript/${transcriptId}?dataset=${dataset}`,
      },
    ]
  }

  return ctx.geneSearch
    .search(upperCaseQuery)
    .flatMap(({ word, docs: geneIds }) => {
      if (geneIds.length > 1) {
        return geneIds.map((geneId) => ({
          label: `${word} (${geneId})`,
          url: `/gene/${geneId}?dataset=${dataset}`,
        }))
      }

      return [
        {
          label: word,
          url: `/gene/${geneIds[0]}?dataset=${dataset}`,
        },
      ]
    })
    .slice(0, 5)
}

module.exports = {
  Query: {
    searchResults: resolveSearchResults,
  },
}
