const fetch = require('node-fetch')

const fetchGenebassResultsByVariantId = async (variantId) => {
  try {
    let data

    try {
      const response = await fetch(`https://genebass.org/api/variant/${variantId}`)
      data = await response.json()
    } catch (error) {
      return null
    }

    if (Array.isArray(data)) {
      return {
        gene_id: data[0].gene_id,
        phenotypes: data[0].phewas_hits,
      }
    }
  } catch (err) {
    return null
  }

  return null
}

module.exports = {
  fetchGenebassResultsByVariantId,
}
