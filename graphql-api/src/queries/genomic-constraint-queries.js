const fetchNccConstraintRegionById = async (esClient, nccId) => {
  try {
    const response = await esClient.get({
      index: 'gnomad_v3_genomic_constraint_regions',
      type: '_doc',
      id: nccId,
    })
    return response.body._source
  } catch (err) {
    return null
  }
}

const returnConstraintsThreshold = 150_000

const fetchNccConstraintsByRegion = async (esClient, region) => {
  // eslint-disable-next-line no-unused-vars
  const { chrom, start, stop } = region

  const constraintRegionSize = 1_000

  // This data becomes incomprehensible if the region is too large
  if (stop - start > returnConstraintsThreshold) return null

  let curr = Math.floor(start / 1000) * 1000
  const allIds = []
  while (curr < stop - constraintRegionSize) {
    const currVariantNCCId = `chr${chrom}-${curr}-${curr + constraintRegionSize}`
    allIds.push(currVariantNCCId)
    curr += constraintRegionSize
  }

  try {
    const response = await esClient.mget({
      index: 'gnomad_v3_genomic_constraint_regions',
      body: {
        ids: allIds,
      },
    })
    const toReturn = response.body.docs.filter((doc) => doc.found).map((doc) => doc._source)
    return toReturn
  } catch (err) {
    return null
  }
}

module.exports = {
  returnConstraintsThreshold,
  fetchNccConstraintRegionById,
  fetchNccConstraintsByRegion,
}
