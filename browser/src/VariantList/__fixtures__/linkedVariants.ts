import clinvarVariantFactory from '../../__factories__/ClinvarVariant'
import { sequencingFactory, variantFactory } from '../../__factories__/Variant'

export const buildLinkedVariantFixture = () => {
  const exome = sequencingFactory.build({ ac: 2, an: 100, filters: [] })
  const genome = sequencingFactory.build({ ac: 6, an: 200, filters: [] })
  const filteredExome = sequencingFactory.build({ ac: 10, an: 100, filters: ['RF'] })
  const definitions = [
    { variant_id: '1-100-A-C', pos: 100, consequence: 'missense_variant', exome, genome: null },
    { variant_id: '1-100-A-G', pos: 100, consequence: 'synonymous_variant', exome, genome: null },
    { variant_id: '1-200-A-C', pos: 200, consequence: 'synonymous_variant', exome: null, genome },
    { variant_id: '1-300-A-AT', pos: 300, consequence: 'frameshift_variant', exome, genome: null },
    {
      variant_id: '1-400-A-C',
      pos: 400,
      consequence: 'missense_variant',
      exome: filteredExome,
      genome: null,
    },
    { variant_id: '1-600-A-C', pos: 600, consequence: 'missense_variant', exome, genome: null },
    { variant_id: '1-700-A-C', pos: 700, consequence: 'missense_variant', exome, genome },
    { variant_id: '1-800-A-C', pos: 800, consequence: 'intron_variant', exome, genome: null },
  ]
  const variants = definitions.map((definition) => ({
    ...variantFactory.build({
      reference_genome: 'GRCh37',
      variant_id: definition.variant_id,
      pos: definition.pos,
      rsids: [],
    }),
    ...definition,
    flags: [],
    hgvs: definition.pos === 100 ? 'search-A' : `record-${definition.pos}`,
    hgvsc: '',
    hgvsp: '',
    transcript_id: '',
    transcript_version: '',
    clinical_significance: '',
    clinvar_variation_id: '',
  }))
  const clinvarDefinitions = [
    {
      pos: 100,
      clinical_significance: 'Pathogenic',
      gold_stars: 4,
      major_consequence: 'stop_gained',
    },
    {
      pos: 200,
      clinical_significance: 'Pathogenic',
      gold_stars: 1,
      major_consequence: 'synonymous_variant',
    },
    {
      pos: 300,
      clinical_significance: 'Benign',
      gold_stars: 3,
      major_consequence: 'frameshift_variant',
    },
    {
      pos: 400,
      clinical_significance: 'Pathogenic',
      gold_stars: 3,
      major_consequence: 'missense_variant',
    },
    {
      pos: 500,
      clinical_significance: 'Pathogenic',
      gold_stars: 4,
      major_consequence: 'missense_variant',
    },
    {
      pos: 700,
      clinical_significance: 'Pathogenic',
      gold_stars: 3,
      major_consequence: 'missense_variant',
    },
    {
      pos: 800,
      clinical_significance: 'Pathogenic',
      gold_stars: 3,
      major_consequence: 'stop_gained',
    },
  ]
  const clinvarVariants = clinvarDefinitions.map((definition) =>
    clinvarVariantFactory.build({
      ...definition,
      variant_id: `1-${definition.pos}-A-${definition.pos === 300 ? 'AT' : 'C'}`,
      in_gnomad: definition.pos !== 500 && definition.pos !== 700,
    })
  )
  return { variants, clinvarVariants }
}

export const buildLinkedV4VariantFixture = (): ReturnType<typeof buildLinkedVariantFixture> => {
  const fixture = buildLinkedVariantFixture()
  const shared = fixture.variants.find((variant) => variant.variant_id === '1-700-A-C')
  if (!shared) throw new Error('Missing shared fixture variant')
  const joint = {
    ...sequencingFactory.build({ ac: 5, an: 250, filters: [] }),
    fafmax: { faf95_max: null, faf95_max_gen_anc: null },
    freq_comparison_stats: {
      contingency_table_test: [],
      cochran_mantel_haenszel_test: { chisq: 0, p_value: 1 },
      stat_union: { p_value: 1, stat_test_name: '', gen_ancs: [] },
    },
  }
  return {
    clinvarVariants: fixture.clinvarVariants,
    variants: [
      {
        ...shared,
        reference_genome: 'GRCh38',
        in_silico_predictors: [],
        exome: sequencingFactory.build({ ac: 0, an: 100, filters: ['AC0'] }),
        joint,
      },
    ],
  }
}

export default buildLinkedVariantFixture
