import React from 'react'

import { Table } from './VariantOccurrenceTable'

import Link from '../Link'
import { LongReadDetails, Section } from './VariantPage'
import TRDistributionPlot from '../Haplotypes/TRDistributionPlot'
import { getTrLocusDistribution } from '../LongReadVariantPage/trLocusAggregation'
import ShortTandemRepeatAttributes from '../ShortTandemRepeatPage/ShortTandemRepeatAttributes'
import { longReadVariantUrl, type LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
  selectGenotypeDistribution,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'

export { selectGenotypeDistribution }

type Props = {
  variantId: string
  chrom: string
  pos: number
  longReadDetails: LongReadDetails
  ref_allele: string
  lrCohort: LongReadCohort
}

type AllelicSeriesAllele = NonNullable<LongReadDetails['allelic_series']>[number]

export const getAllelicSeriesDistribution = (alleles: AllelicSeriesAllele[]) =>
  getTrLocusDistribution(
    alleles.map((allele) => ({
      variant_id: allele.variant_id,
      pos: 0,
      end: null,
      allele_length: allele.length,
      main_reference_region: null,
      freq: {
        all: { ac: allele.ac, an: allele.an, af: allele.af },
        populations: allele.populations,
      },
    }))
  )

const formatAlleleType = (alleleType: string | null) => {
  if (!alleleType) return '—'
  const labels: Record<string, string> = {
    del: 'Deletion',
    dup: 'Duplication',
    ins: 'Insertion',
    snv: 'Single-nucleotide variant',
    trv: 'Tandem-repeat variant',
  }
  return labels[alleleType.toLowerCase()] || alleleType.toUpperCase()
}

const LongReadVariantDetails = ({
  variantId,
  chrom,
  pos,
  longReadDetails,
  ref_allele,
  lrCohort,
}: Props) => {
  const {
    allele_size_distribution,
    allelic_series,
    end,
    enveloped_ids,
    enveloping_tr_id,
    genotype_distribution,
    length,
    main_reference_region,
    max_repunits,
    motifs,
    short_read_match_id,
    short_read_match_source,
    short_read_match_type,
    sv_consequences,
  } = longReadDetails

  const repeatUnits = motifs && motifs.length > 0 ? motifs : [ref_allele]

  return (
    <>
      <Section>
        <h2>Long-Read Variant Details</h2>
        <Table>
          <tbody>
            <tr>
              <th scope="row">Allele type</th>
              <td>{formatAlleleType(longReadDetails.allele_type)}</td>
            </tr>
            <tr>
              <th scope="row">Position</th>
              <td>
                {chrom}:{pos.toLocaleString()}
                {end != null && end !== pos ? `–${end.toLocaleString()}` : ''}
              </td>
            </tr>
            {length != null && (
              <tr>
                <th scope="row">Allele length</th>
                <td>{Math.abs(length).toLocaleString()} bp</td>
              </tr>
            )}
            {motifs && motifs.length > 0 && (
              <tr>
                <th scope="row">Repeat motif{motifs.length === 1 ? '' : 's'}</th>
                <td>{motifs.join(', ')}</td>
              </tr>
            )}
            {sv_consequences && sv_consequences.length > 0 && (
              <tr>
                <th scope="row">Structural consequences</th>
                <td>{sv_consequences.join(', ')}</td>
              </tr>
            )}
            {short_read_match_id && (
              <tr>
                <th scope="row">Short-read match</th>
                <td>
                  <Link
                    to={`/variant/${short_read_match_id}?dataset=gnomad_r4`}
                    preserveSelectedDataset={false}
                  >
                    View {short_read_match_id} in gnomAD v4 short reads
                  </Link>
                  {(short_read_match_type || short_read_match_source) && (
                    <span>
                      {' '}
                      ({[short_read_match_type, short_read_match_source].filter(Boolean).join(', ')}
                      )
                    </span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Section>

      {main_reference_region && (
        <Section>
          <h2>Tandem Repeat Reference Region</h2>
          <ShortTandemRepeatAttributes
            reference_repeat_unit={repeatUnits[0]}
            repeat_units={repeatUnits.map((repeatUnit) => ({
              repeat_unit: repeatUnit,
              classification: 'unknown',
            }))}
            main_reference_region={main_reference_region}
          />
        </Section>
      )}

      {allelic_series && allelic_series.length > 0 && (
        <Section>
          <h2>TR Allelic Series</h2>
          <p>
            ALT allele-length differences and counts for this tandem-repeat record. Y1 does not yet
            provide repeat-unit or genotype histograms.
          </p>
          <TRDistributionPlot
            distribution={getAllelicSeriesDistribution(allelic_series)}
            yAxisLabel="Allele count"
            ariaLabel="TR ALT allele-length distribution"
          />
        </Section>
      )}

      {allele_size_distribution && max_repunits != null && (
        <Section>
          <LongReadAlleleSizeDistributionSection
            variantId={variantId}
            alleleSizeDistribution={allele_size_distribution}
            maxRepunits={max_repunits}
          />
        </Section>
      )}

      {genotype_distribution && genotype_distribution.length > 0 && (
        <Section>
          <LongReadGenotypeDistributionSection
            variantId={variantId}
            genotypeDistribution={genotype_distribution}
          />
        </Section>
      )}

      {enveloping_tr_id && (
        <Section>
          <h2>Enveloping Tandem Repeat</h2>
          <p>
            This variant falls within a tandem-repeat region.{' '}
            <Link
              to={longReadVariantUrl(enveloping_tr_id, lrCohort)}
              preserveSelectedDataset={false}
            >
              View parent TR: {enveloping_tr_id}
            </Link>
          </p>
        </Section>
      )}

      {enveloped_ids && enveloped_ids.length > 0 && (
        <Section>
          <h2>Overlapping Variant Calls</h2>
          <p>
            These variants were independently called within this repeat region and may reflect the
            same repeat-length event.
          </p>
          <ul>
            {enveloped_ids.map((id) => (
              <li key={id}>
                <Link to={longReadVariantUrl(id, lrCohort)} preserveSelectedDataset={false}>
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}

export default LongReadVariantDetails
