module.exports = {
  Variant: {
    // Workaround. gnomAD v2/ExAC variants with no rsID have a set containing null in the rsids field.
    rsids: (obj) => (obj.rsids || []).filter((rsid) => rsid !== null),
  },
  VariantDetails: {
    // Workaround. gnomAD v2/ExAC variants with no rsID have a set containing null in the rsids field.
    rsids: (obj) => (obj.rsids || []).filter((rsid) => rsid !== null),
  },
}
