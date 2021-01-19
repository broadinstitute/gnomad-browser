import PropTypes from 'prop-types'
import React, { useMemo } from 'react'

import { Badge } from '@gnomad/ui'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import annotateVariantsWithClinvar from '../VariantList/annotateVariantsWithClinvar'
import { getColumns } from '../VariantList/variantTableColumns'
import Variants from '../VariantList/Variants'

const VariantsInRegion = ({ clinvarVariants, datasetId, region, variants, width }) => {
  const columns = useMemo(
    () =>
      getColumns({
        context: 'region',
        width,
        includeLofCuration: variants.some(variant => variant.lof_curation),
        includeHomozygoteAC: region.chrom !== 'Y',
        includeHemizygoteAC: region.chrom === 'X' || region.chrom === 'Y',
      }),
    [region, variants, width]
  )

  const datasetLabel = labelForDataset(datasetId)

  return (
    <Variants
      clinvarVariants={clinvarVariants}
      columns={columns}
      datasetId={datasetId}
      exportFileName={`${datasetLabel}_${region.chrom}-${region.start}-${region.stop}`}
      variants={variants}
    >
      {datasetId.startsWith('gnomad_r3') && (
        <p>
          <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where some
          variants are missing VEP annotations. As a result, some variants in the table below may be
          missing consequences. We are working on a resolution for this issue.
        </p>
      )}
    </Variants>
  )
}

VariantsInRegion.propTypes = {
  clinvarVariants: PropTypes.arrayOf(PropTypes.object),
  datasetId: PropTypes.string.isRequired,
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  width: PropTypes.number.isRequired,
}

VariantsInRegion.defaultProps = {
  clinvarVariants: null,
}

const query = `
query VariantInRegion($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  region(start: $start, stop: $stop, chrom: $chrom, reference_genome: $referenceGenome) {
    clinvar_variants {
      clinical_significance
      clinvar_variation_id
      gold_stars
      hgvsc
      hgvsp
      major_consequence
      pos
      review_status
      variant_id
    }
    variants(dataset: $datasetId) {
      consequence
      flags
      gene_id
      gene_symbol
      hgvs
      hgvsc
      hgvsp
      lof
      lof_filter
      lof_flags
      pos
      rsid
      variant_id
      exome {
        ac
        ac_hemi
        ac_hom
        an
        af
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
      }
      genome {
        ac
        ac_hemi
        ac_hom
        an
        af
        filters
        populations {
          id
          ac
          an
          ac_hemi
          ac_hom
        }
      }
      lof_curation {
        verdict
        flags
      }
    }
  }
}`

const ConnectedVariantsInRegion = ({ datasetId, region, width }) => (
  <Query
    query={query}
    variables={{
      datasetId,
      chrom: region.chrom,
      start: region.start,
      stop: region.stop,
      referenceGenome: referenceGenomeForDataset(datasetId),
    }}
    loadingMessage="Loading variants"
    errorMessage="Unable to load variants"
    success={data => data.region && data.region.variants}
  >
    {({ data }) => {
      return (
        <VariantsInRegion
          clinvarVariants={data.region.clinvar_variants}
          datasetId={datasetId}
          region={region}
          variants={annotateVariantsWithClinvar(data.region.variants, data.region.clinvar_variants)}
          width={width}
        />
      )
    }}
  </Query>
)

ConnectedVariantsInRegion.propTypes = {
  datasetId: PropTypes.string.isRequired,
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  width: PropTypes.number.isRequired,
}

export default ConnectedVariantsInRegion
