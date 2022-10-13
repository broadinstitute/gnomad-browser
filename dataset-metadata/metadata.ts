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
} as const
export type DatasetId = keyof typeof datasetLabels

export const allDatasetIds = Object.getOwnPropertyNames(datasetLabels) as DatasetId[]

// Regex below matches, e.g., gnomad_r1_2_3_4, but not gnomad_r1_2_3_4_foo

const fullDatasetIds = allDatasetIds.filter(
  (datasetId) => datasetId === 'exac' || datasetId.match(/_r\d+(_\d+)*$/)
)

export type DatasetMetadata = {
  label: string
  isSubset: boolean
  hasShortVariants: boolean
  hasStructuralVariants: boolean
  hasConstraints: boolean
  hasNonCodingConstraints: boolean
  hasExomeCoverage: boolean
  referenceGenome: ReferenceGenome
}

const structuralVariantDatasetIds = allDatasetIds.filter((datasetId) =>
  datasetId.startsWith('gnomad_sv')
)

const metadataForDataset = (datasetId: DatasetId): DatasetMetadata => ({
  label: datasetLabels[datasetId],
  isSubset: !fullDatasetIds.includes(datasetId),
  hasShortVariants: !structuralVariantDatasetIds.includes(datasetId),
  hasStructuralVariants: structuralVariantDatasetIds.includes(datasetId),
  hasConstraints: !datasetId.startsWith('gnomad_r3'),
  hasNonCodingConstraints: datasetId.startsWith('gnomad_r3'),
  referenceGenome: datasetId.startsWith('gnomad_r3') ? 'GRCh38' : 'GRCh37',
  hasExomeCoverage: !datasetId.startsWith('gnomad_r3'),
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

export const hasNonCodingConstraints = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasNonCodingConstraints')

export const hasExomeCoverage = (datsetId: DatasetId) => getMetadata(datsetId, 'hasExomeCoverage')

export const hasShortVariants = (datasetId: DatasetId) => getMetadata(datasetId, 'hasShortVariants')

export const hasStructuralVariants = (datasetId: DatasetId) =>
  getMetadata(datasetId, 'hasStructuralVariants')

export const referenceGenome = (datasetId: DatasetId) => getMetadata(datasetId, 'referenceGenome')
