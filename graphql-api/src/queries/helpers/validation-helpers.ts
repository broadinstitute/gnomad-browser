import { DATASET_LABELS, DATASET_REFERENCE_GENOMES } from '../../datasets'
import { UserVisibleError } from '../../errors'

export const assertDatasetAndReferenceGenomeMatch = (datasetId: any, referenceGenome: any) => {
  if (!(datasetId in DATASET_LABELS)) {
    throw new UserVisibleError(
      `Dataset with id ${datasetId} does not exist`
    )
  }

  if (DATASET_REFERENCE_GENOMES[datasetId] !== referenceGenome) {
    throw new UserVisibleError(
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      `${DATASET_LABELS[datasetId]} data is not available on reference genome ${referenceGenome}`
    )
  }
}
