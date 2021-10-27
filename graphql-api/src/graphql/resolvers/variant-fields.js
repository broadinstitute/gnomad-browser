module.exports = {
  Variant: {
    // Workaround for #743 (https://github.com/broadinstitute/gnomad-browser/issues/743)
    // gnomAD v2/ExAC variants with no rsID have a set containing null in the rsids field.
    rsids: (obj) => (obj.rsids || []).filter((rsid) => rsid !== null),
  },
  VariantDetails: {
    // Workaround for #743 (https://github.com/broadinstitute/gnomad-browser/issues/743)
    // gnomAD v2/ExAC variants with no rsID have a set containing null in the rsids field.
    rsids: (obj) => (obj.rsids || []).filter((rsid) => rsid !== null),
  },
}
