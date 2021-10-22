module.exports = {
  Variant: {
    // Filter out null domains caused by missing domain name.
    // Fixed in data pipeline. This can be removed after reloading variants.
    domains: (obj) => {
      const majorConsequence = obj.transcript_consequence || {}
      return (majorConsequence.domains || []).filter((domain) => domain !== null)
    },
    // Workaround for #743 (https://github.com/broadinstitute/gnomad-browser/issues/743)
    // gnomAD v2/ExAC variants with no rsID have a set containing null in the rsids field.
    rsids: (obj) => (obj.rsids || []).filter((rsid) => rsid !== null),
  },
  VariantDetails: {
    // Workaround for #743 (https://github.com/broadinstitute/gnomad-browser/issues/743)
    // gnomAD v2/ExAC variants with no rsID have a set containing null in the rsids field.
    rsids: (obj) => (obj.rsids || []).filter((rsid) => rsid !== null),
  },
  TranscriptConsequence: {
    // Filter out null domains caused by missing domain name.
    // Fixed in data pipeline. This can be removed after reloading variants.
    domains: (obj) => (obj.domains || []).filter((domain) => domain !== null),
  },
}
