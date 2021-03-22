const fieldAliasResolver = (field) => {
  return (obj) => obj[field]
}

const majorConsequenceFieldResolver = (field) => {
  return (obj) => (obj.transcript_consequence || {})[field]
}

module.exports = {
  GnomadConstraint: {
    pLI: fieldAliasResolver('pli'),
  },
  ExacConstraint: {
    pLI: fieldAliasResolver('pli'),
  },
  ClinVarVariant: {
    hgvsc: majorConsequenceFieldResolver('hgvsc'),
    hgvsp: majorConsequenceFieldResolver('hgvsp'),
    major_consequence: majorConsequenceFieldResolver('major_consequence'),
  },
  Variant: {
    // Old camel case fields
    variantId: fieldAliasResolver('variant_id'),
    // Single rsID
    rsid: (obj) => (obj.rsids || [])[0],
    // Major consequence fields
    consequence: majorConsequenceFieldResolver('major_consequence'),
    consequence_in_canonical_transcript: majorConsequenceFieldResolver('canonical'),
    gene_id: majorConsequenceFieldResolver('gene_id'),
    gene_symbol: majorConsequenceFieldResolver('gene_symbol'),
    transcript_id: majorConsequenceFieldResolver('transcript_id'),
    hgvsc: majorConsequenceFieldResolver('hgvsc'),
    hgvsp: majorConsequenceFieldResolver('hgvsp'),
    hgvs: (obj) => {
      const majorConsequence = obj.transcript_consequence || {}
      return majorConsequence.hgvsp || majorConsequence.hgvsc
    },
    lof: majorConsequenceFieldResolver('lof'),
    lof_filter: majorConsequenceFieldResolver('lof_filter'),
    lof_flags: majorConsequenceFieldResolver('lof_flags'),
  },
  VariantDetails: {
    // Single rsID
    rsid: (obj) => (obj.rsids || [])[0],
    // Old camel case fields
    colocatedVariants: fieldAliasResolver('colocated_variants'),
    multiNucleotideVariants: fieldAliasResolver('multi_nucleotide_variants'),
    sortedTranscriptConsequences: fieldAliasResolver('transcript_consequences'),
    variantId: fieldAliasResolver('variant_id'),
  },
  VariantSequencingTypeData: {
    ac_hom: fieldAliasResolver('homozygote_count'),
    ac_hemi: fieldAliasResolver('hemizygote_count'),
    af: (obj) => (obj.an === 0 ? 0 : obj.ac / obj.an),
  },
  VariantDetailsSequencingTypeData: {
    qualityMetrics: fieldAliasResolver('quality_metrics'),
    ac_hom: fieldAliasResolver('homozygote_count'),
    ac_hemi: fieldAliasResolver('hemizygote_count'),
    af: (obj) => (obj.an === 0 ? 0 : obj.ac / obj.an),
  },
  VariantPopulation: {
    ac_hom: fieldAliasResolver('homozygote_count'),
    ac_hemi: fieldAliasResolver('hemizygote_count'),
  },
  VariantQualityMetrics: {
    alleleBalance: fieldAliasResolver('allele_balance'),
    genotypeDepth: fieldAliasResolver('genotype_depth'),
    genotypeQuality: fieldAliasResolver('genotype_quality'),
    siteQualityMetrics: fieldAliasResolver('site_quality_metrics'),
  },
  TranscriptConsequence: {
    canonical: fieldAliasResolver('is_canonical'),
    hgvs: (obj) => obj.hgvsp || obj.hgvsc,
  },
  StructuralVariant: {
    consequence: fieldAliasResolver('major_consequence'),
    ac_hom: fieldAliasResolver('homozygote_count'),
    ac_hemi: fieldAliasResolver('hemizygote_count'),
  },
  StructuralVariantDetails: {
    consequence: fieldAliasResolver('major_consequence'),
    ac_hom: fieldAliasResolver('homozygote_count'),
    ac_hemi: fieldAliasResolver('hemizygote_count'),
  },
  StructuralVariantPopulation: {
    ac_hom: fieldAliasResolver('homozygote_count'),
    ac_hemi: fieldAliasResolver('hemizygote_count'),
  },
  MitochondrialVariant: {
    // Major consequence fields
    consequence: majorConsequenceFieldResolver('major_consequence'),
    gene_id: majorConsequenceFieldResolver('gene_id'),
    gene_symbol: majorConsequenceFieldResolver('gene_symbol'),
    transcript_id: majorConsequenceFieldResolver('transcript_id'),
    hgvsc: majorConsequenceFieldResolver('hgvsc'),
    hgvsp: majorConsequenceFieldResolver('hgvsp'),
    lof: majorConsequenceFieldResolver('lof'),
    lof_filter: majorConsequenceFieldResolver('lof_filter'),
    lof_flags: majorConsequenceFieldResolver('lof_flags'),
  },
}
