export type ReferenceGenome = 'GRCh37' | 'GRCh38'

export const datasetLabels = {
  exac: 'ExAC v1.0',
  gnomad_r2_1: 'gnomAD v2.1.1',
  gnomad_r2_1_controls: 'gnomAD v2.1.1 (controls)',
  gnomad_r2_1_non_cancer: 'gnomAD v2.1.1 (non-cancer)',
  gnomad_r2_1_non_neuro: 'gnomAD v2.1.1 (non-neuro)',
  gnomad_r2_1_non_topmed: 'gnomAD v2.1.1 (non-TOPMed)',
  gnomad_r3: 'gnomAD v3.1.2',
  gnomad_r3_controls_and_biobanks: 'gnomAD v3.1.2 (controls/biobanks)',
  gnomad_r3_non_cancer: 'gnomAD v3.1.2 (non-cancer)',
  gnomad_r3_non_neuro: 'gnomAD v3.1.2 (non-neuro)',
  gnomad_r3_non_topmed: 'gnomAD v3.1.2 (non-TOPMed)',
  gnomad_r3_non_v2: 'gnomAD v3.1.2 (non-v2)',
  gnomad_sv_r2_1: 'gnomAD SVs v2.1',
  gnomad_sv_r2_1_controls: 'gnomAD SVs v2.1 (controls)',
  gnomad_sv_r2_1_non_neuro: 'gnomAD SVs v2.1 (non-neuro)',
  gnomad_sv_r4: 'gnomAD SVs v4.0',
  gnomad_cnv_r4: 'gnomAD CNVs v4.0',
  gnomad_r4: 'gnomAD v4.0.0',
} as const
export type DatasetId = keyof typeof datasetLabels

export const allDatasetIds = Object.getOwnPropertyNames(datasetLabels) as DatasetId[]

// Regex below matches, e.g., gnomad_r1_2_3_4, but not gnomad_r1_2_3_4_foo

const fullDatasetIds = allDatasetIds.filter(
  (datasetId) => datasetId === 'exac' || datasetId.match(/_r\d+(_\d+)*$/)
)

const extractReadsDatasetId = (datasetId: DatasetId) => {
  if (datasetId.startsWith('gnomad_r4')) {
    return 'gnomad_r4'
  }
  if (datasetId.startsWith('gnomad_r3')) {
    return 'gnomad_r3'
  }
  if (datasetId.startsWith('gnomad_r2')) {
    return 'gnomad_r2'
  }
  return datasetId
}

const extractCoverageDatasetId = (datasetId: DatasetId): DatasetId => {
  if (datasetId.startsWith('gnomad_r4')) {
    return 'gnomad_r4'
  }

  // Coverage is not broken down by subset for gnomAD 3.1
  // Map all subset datasets to the main dataset.
  if (datasetId.startsWith('gnomad_r3')) {
    return 'gnomad_r3'
  }

  // Coverage is not broken down by subset for gnomAD 2.1
  // Map all subset datasets to the main dataset.
  if (datasetId.startsWith('gnomad_r2_1')) {
    return 'gnomad_r2_1'
  }

  // v2 SVs should show gnomAD 2.1 coverage
  if (datasetId.startsWith('gnomad_sv_r2')) {
    return 'gnomad_r2_1'
  }

  // v4 SVs should show gnomAD 3.1.2 coverage
  if (datasetId.startsWith('gnomad_sv_r4')) {
    return 'gnomad_r3'
  }
  if (datasetId.startsWith('gnomad_cnv_r4')) {
    return 'gnomad_r4'
  }

  return datasetId
}

const extractVariantFeedbackDescription = (datasetId: DatasetId): string | null => {
  if (datasetId.startsWith('gnomad_r4') || datasetId.startsWith('gnomad_cnv_r4')) {
    return 'gnomAD v4'
  }
  if (datasetId.startsWith('gnomad_r3') || datasetId.startsWith('gnomad_sv_r4')) {
    return 'gnomAD v3'
  }
  if (datasetId.startsWith('gnomad_r2') || datasetId.startsWith('gnomad_sv_r2')) {
    return 'gnomAD v2'
  }
  return null
}

const extractShortVariantDatasetId = (datasetId: DatasetId): DatasetId => {
  if (datasetId.startsWith('gnomad_cnv')) {
    return 'gnomad_r3'
  }

  if (!datasetId.startsWith('gnomad_sv')) {
    return datasetId
  }

  if (datasetId.startsWith('gnomad_sv_r2')) {
    return 'gnomad_r2_1'
  }

  return 'gnomad_r4'
}

const extractStructuralVariantDatasetId = (datasetId: DatasetId): DatasetId => {
  if (datasetId.startsWith('gnomad_sv')) {
    return datasetId
  }

  if (datasetId.startsWith('gnomad_r2') || datasetId === 'exac') {
    return 'gnomad_sv_r2_1'
  }

  return 'gnomad_sv_r4'
}
const extractCopyNumberVariantDatasetId = (datasetId: DatasetId): DatasetId => {
  if (datasetId.startsWith('gnomad_cnv')) {
    return datasetId
  }

  return 'gnomad_cnv_r4'
}

type DatasetMetadata = {
  referenceGenome: ReferenceGenome
  label: string
  isSubset: boolean
  hasShortVariants: boolean
  hasStructuralVariants: boolean
  hasCopyNumberVariants: boolean
  hasCopyNumberVariantCoverage: boolean
  hasConstraints: boolean
  hasVariantCoocurrence: boolean
  hasNonCodingConstraints: boolean
  hasExome: boolean
  genesHaveExomeCoverage: boolean
  genesHaveGenomeCoverage: boolean
  transcriptsHaveExomeCoverage: boolean
  regionsHaveExomeCoverage: boolean
  regionsHaveGenomeCoverage: boolean
  hasLocalAncestryPopulations: boolean
  isLiftoverSource: boolean
  isLiftoverTarget: boolean
  isV3Subset: boolean
  usesGrch37: boolean
  usesGrch38: boolean
  isV2: boolean
  isV3: boolean
  isV4: boolean
  isExac: boolean
  isSVs: boolean
  isV4SVs: boolean
  isCNVs: boolean
  isV4CNVs: boolean
  hasV2Genome: boolean
  metricsIncludeLowQualityGenotypes: boolean
  has1000GenomesPopulationFrequencies: boolean
  hasAlleleBalance: boolean
  hasRelatedVariants: boolean
  showAllIndividualsInAgeDistributionByDefault: boolean
  hasExons: boolean
  hasShortTandemRepeats: boolean
  hasMitochondrialGenomeCoverage: boolean
  hasMitochondrialVariants: boolean
  hasNonCodingReadData: boolean
  readsDatasetId: string
  readsIncludeLowQualityGenotypes: boolean
  coverageDatasetId: DatasetId
  variantFeedbackDescription: string | null
  shortVariantDatasetId: DatasetId
  structuralVariantDatasetId: DatasetId
  copyNumberVariantDatasetId: DatasetId
}

const structuralVariantDatasetIds = allDatasetIds.filter((datasetId) =>
  datasetId.startsWith('gnomad_sv')
)

const copyNumberVariantDatasetIds = allDatasetIds.filter((datasetId) =>
  datasetId.startsWith('gnomad_cnv')
)

const metadataForDataset = (datasetId: DatasetId): DatasetMetadata => ({
  label: datasetLabels[datasetId],
  isSubset: !fullDatasetIds.includes(datasetId),
  isV3Subset: !fullDatasetIds.includes(datasetId) && datasetId.startsWith('gnomad_r3'),
  isV4SVs: datasetId === 'gnomad_sv_r4',
  hasShortVariants:
    !structuralVariantDatasetIds.includes(datasetId) &&
    !copyNumberVariantDatasetIds.includes(datasetId),
  hasStructuralVariants: structuralVariantDatasetIds.includes(datasetId),
  hasCopyNumberVariants: copyNumberVariantDatasetIds.includes(datasetId),
  hasCopyNumberVariantCoverage: datasetId.startsWith('gnomad_cnv'),
  hasVariantCoocurrence: datasetId.startsWith('gnomad') && datasetId.includes('r2'),
  hasConstraints:
    datasetId.includes('r4') ||
    datasetId.startsWith('gnomad_sv_r4') ||
    datasetId.startsWith('gnomad_r2') ||
    datasetId.startsWith('gnomad_sv_r2') ||
    datasetId === 'exac',
  hasNonCodingConstraints: datasetId.startsWith('gnomad_r3') || datasetId === 'gnomad_sv_r4',
  hasExome: !datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_sv_r4',
  genesHaveExomeCoverage: !datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_sv_r4',
  transcriptsHaveExomeCoverage: !datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_sv_r4',
  referenceGenome:
    datasetId.startsWith('gnomad_r3') ||
      datasetId.startsWith('gnomad_r4') ||
      datasetId === 'gnomad_sv_r4' ||
      datasetId === 'gnomad_cnv_r4'
      ? 'GRCh38'
      : 'GRCh37',
  genesHaveGenomeCoverage: !datasetId.startsWith('gnomad_cnv'),
  regionsHaveExomeCoverage:
    !datasetId.startsWith('gnomad_sv') && !datasetId.startsWith('gnomad_r3'),
  regionsHaveGenomeCoverage: !datasetId.startsWith('gnomad_cnv'),
  hasLocalAncestryPopulations:
    datasetId.startsWith('gnomad_r3') ||
    datasetId === 'gnomad_sv_r4' ||
    datasetId.startsWith('gnomad_r4'),
  isLiftoverSource: datasetId.startsWith('gnomad_r2_1'),
  isLiftoverTarget: datasetId.startsWith('gnomad_r4'),
  usesGrch37:
    !datasetId.startsWith('gnomad_r3') &&
    datasetId !== 'gnomad_sv_r4' &&
    !datasetId.startsWith('gnomad_r4'),
  usesGrch38:
    datasetId.startsWith('gnomad_r3') ||
    datasetId.startsWith('gnomad_r4') ||
    datasetId === 'gnomad_sv_r4',
  isV2: datasetId.startsWith('gnomad_r2'),
  isV3: datasetId.startsWith('gnomad_r3'),
  isV4: datasetId.includes('r4'),
  isSVs: datasetId.startsWith('gnomad_sv'),
  isCNVs: datasetId.startsWith('gnomad_cnv'),
  isV4CNVs: datasetId === 'gnomad_cnv_r4',
  isExac: datasetId === 'exac',
  hasV2Genome: datasetId.startsWith('gnomad_r2'),
  metricsIncludeLowQualityGenotypes: datasetId.startsWith('gnomad_r2') || datasetId === 'exac',
  has1000GenomesPopulationFrequencies:
    datasetId.startsWith('gnomad_r3') && datasetId !== 'gnomad_r3_non_v2',
  hasAlleleBalance: datasetId !== 'exac',
  hasRelatedVariants: datasetId !== 'gnomad_r2_1',
  showAllIndividualsInAgeDistributionByDefault: datasetId !== 'exac',
  hasExons: !datasetId.startsWith('gnomad_sv'),
  hasShortTandemRepeats: datasetId.startsWith('gnomad_r3') || datasetId.startsWith('gnomad_r4') || datasetId === "gnomad_sv_r4",
  hasMitochondrialGenomeCoverage: !(datasetId === 'exac' || datasetId.startsWith('gnomad_r2')),
  hasMitochondrialVariants: !(datasetId === 'exac' || datasetId.startsWith('gnomad_r2')),
  hasNonCodingReadData: !(datasetId === 'exac' || datasetId.startsWith('gnomad_r2')),
  readsDatasetId: extractReadsDatasetId(datasetId),
  readsIncludeLowQualityGenotypes: datasetId.startsWith('gnomad_r2'),
  coverageDatasetId: extractCoverageDatasetId(datasetId),
  variantFeedbackDescription: extractVariantFeedbackDescription(datasetId),
  shortVariantDatasetId: extractShortVariantDatasetId(datasetId),
  structuralVariantDatasetId: extractStructuralVariantDatasetId(datasetId),
  copyNumberVariantDatasetId: extractCopyNumberVariantDatasetId(datasetId),
})

const metadata = allDatasetIds.reduce(
  (result, datasetId) => ({ ...result, [datasetId]: metadataForDataset(datasetId) }),
  {} as Record<DatasetId, DatasetMetadata>
)

const getMetadata = <T extends keyof DatasetMetadata>(
  datasetId: DatasetId,
  fieldName: T
): DatasetMetadata[T] => {
  const foundMetadata = metadata[datasetId]
  return foundMetadata[fieldName]
}

export const isSubset = (datasetId: DatasetId) => getMetadata(datasetId, 'isSubset')

export const labelForDataset = (datasetId: DatasetId) => getMetadata(datasetId, 'label')

export const hasConstraints = (datsetId: DatasetId) => getMetadata(datsetId, 'hasConstraints')

export const hasVariantCoocurrence = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasVariantCoocurrence')

export const hasNonCodingConstraints = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasNonCodingConstraints')

export const hasExome = (datsetId: DatasetId) => getMetadata(datsetId, 'hasExome')

export const genesHaveExomeCoverage = (datsetId: DatasetId) =>
  getMetadata(datsetId, 'genesHaveExomeCoverage')

export const genesHaveGenomeCoverage = (datsetId: DatasetId) =>
  getMetadata(datsetId, 'genesHaveGenomeCoverage')

export const transcriptsHaveExomeCoverage = (datsetId: DatasetId) =>
  getMetadata(datsetId, 'transcriptsHaveExomeCoverage')

export const regionsHaveExomeCoverage = (datsetId: DatasetId) =>
  getMetadata(datsetId, 'regionsHaveExomeCoverage')

export const regionsHaveGenomeCoverage = (datsetId: DatasetId) =>
  getMetadata(datsetId, 'regionsHaveGenomeCoverage')

export const hasShortVariants = (datasetId: DatasetId) => getMetadata(datasetId, 'hasShortVariants')

export const hasStructuralVariants = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasStructuralVariants')

export const hasCopyNumberVariants = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasCopyNumberVariants')

export const hasLocalAncestryPopulations = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasLocalAncestryPopulations')

export const isLiftoverSource = (datasetId: DatasetId) => getMetadata(datasetId, 'isLiftoverSource')

export const isLiftoverTarget = (datasetId: DatasetId) => getMetadata(datasetId, 'isLiftoverTarget')

export const referenceGenome = (datasetId: DatasetId) => getMetadata(datasetId, 'referenceGenome')

export const usesGrch37 = (datasetId: DatasetId) => getMetadata(datasetId, 'usesGrch37')

export const usesGrch38 = (datasetId: DatasetId) => getMetadata(datasetId, 'usesGrch38')

export const isV3Subset = (datasetId: DatasetId) => getMetadata(datasetId, 'isV3Subset')

export const isV2 = (datasetId: DatasetId) => getMetadata(datasetId, 'isV2')

export const isV3 = (datasetId: DatasetId) => getMetadata(datasetId, 'isV3')

export const isV4 = (datasetId: DatasetId) => getMetadata(datasetId, 'isV4')

export const isExac = (datasetId: DatasetId) => getMetadata(datasetId, 'isExac')

export const isSVs = (datasetId: DatasetId) => getMetadata(datasetId, 'isSVs')

export const hasV2Genome = (datasetId: DatasetId) => getMetadata(datasetId, 'hasV2Genome')

export const metricsIncludeLowQualityGenotypes = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'metricsIncludeLowQualityGenotypes')

export const has1000GenomesPopulationFrequencies = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'has1000GenomesPopulationFrequencies')

export const hasAlleleBalance = (datasetId: DatasetId) => getMetadata(datasetId, 'hasAlleleBalance')

export const hasRelatedVariants = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasRelatedVariants')

export const showAllIndividualsInAgeDistributionByDefault = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'showAllIndividualsInAgeDistributionByDefault')

export const hasExons = (datasetId: DatasetId) => getMetadata(datasetId, 'hasExons')

export const hasShortTandemRepeats = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasShortTandemRepeats')

export const hasMitochondrialGenomeCoverage = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasMitochondrialGenomeCoverage')

export const hasMitochondrialVariants = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasMitochondrialVariants')

export const hasNonCodingReadData = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasNonCodingReadData')

export const readsDatasetId = (datasetId: DatasetId) => getMetadata(datasetId, 'readsDatasetId')

export const readsIncludeLowQualityGenotypes = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'readsIncludeLowQualityGenotypes')

export const coverageDatasetId = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'coverageDatasetId')

export const variantFeedbackDescription = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'variantFeedbackDescription')

export const isV4SVs = (datasetId: DatasetId) => getMetadata(datasetId, 'isV4SVs')

export const shortVariantDatasetId = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'shortVariantDatasetId')

export const structuralVariantDatasetId = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'structuralVariantDatasetId')
export const isV4CNVs = (datasetId: DatasetId) => getMetadata(datasetId, 'isV4CNVs')

export const copyNumberVariantDatasetId = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'copyNumberVariantDatasetId')

export const hasCopyNumberVariantCoverage = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasCopyNumberVariantCoverage')
