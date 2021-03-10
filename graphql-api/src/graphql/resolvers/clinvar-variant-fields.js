module.exports = {
  ClinVarVariant: {
    gnomad: (variant) => (variant.gnomad.exome || variant.gnomad.genome ? variant.gnomad : null),
  },
}
