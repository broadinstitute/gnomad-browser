import { DATASET_LABELS } from '../datasets'
import { UserVisibleError } from '../errors'
import { catchNotFound } from '../elasticsearch'

type DatasetId = keyof typeof DATASET_LABELS

export const fetchMultiNuceotideVariantById = async (
  esClient: any,
  datasetId: DatasetId,
  variantId: any
) => {
  if (datasetId !== 'gnomad_r2_1') {
    throw new UserVisibleError(
      `Multi-nucleotide variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  try {
    const response = await esClient.get({
      index: 'gnomad_v2_mnvs',
      type: '_doc',
      id: variantId,
    })

    const variant = response.body._source.value

    return {
      ...variant,
      reference_genome: 'GRCh37',
      constituent_snvs: variant.constituent_snvs.map((snv: any) => ({
        ...snv,
        exome: snv.exome.ac !== undefined ? snv.exome : null,
        genome: snv.genome.ac !== undefined ? snv.genome : null,
      })),
      exome: variant.exome.ac !== undefined ? variant.exome : null,
      genome: variant.genome.ac !== undefined ? variant.genome : null,
    }
  } catch (err) {
    return catchNotFound(err)
  }
}
