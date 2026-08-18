import React from 'react'

import { Table } from './VariantOccurrenceTable'

import Link from '../Link'
import { LongReadDetails, Section } from './VariantPage'
import ExpandedTrDistributions from '../Haplotypes/ExpandedTrDistributions'
import TRDistributionPlot from '../Haplotypes/TRDistributionPlot'
import { getTrLocusDistribution } from '../LongReadVariantPage/trLocusAggregation'
import ShortTandemRepeatAttributes from '../ShortTandemRepeatPage/ShortTandemRepeatAttributes'
import { longReadVariantUrl, type LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  formatLongReadAlleleDisplay,
  formatLongReadVariantId,
} from '../LongReadVariantPage/formatLongReadVariantId'
import ExactTrAltMotifStructure from './ExactTrAltMotifStructure'

export { selectGenotypeDistribution } from '../LongReadVariantPage/LongReadSTRDistributionSections'

type Props = {
  variantId: string
  chrom: string
  pos: number
  longReadDetails: LongReadDetails
  ref_allele: string
  alt_allele: string
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
  alt_allele,
  lrCohort,
}: Props) => {
  const {
    allelic_series,
    end,
    enveloped_ids,
    enveloping_tr_id,
    length,
    main_reference_region,
    motifs,
    short_read_match_id,
    short_read_match_source,
    short_read_match_type,
    sv_consequences,
  } = longReadDetails

  const repeatUnits = motifs && motifs.length > 0 ? motifs : [ref_allele]
  const isTandemRepeat = longReadDetails.allele_type?.toLowerCase() === 'trv'
  const identity = formatLongReadAlleleDisplay({
    variant_id: variantId,
    source_variant_id: longReadDetails.source_variant_id,
    alt_index: longReadDetails.alt_index,
    alt_count: longReadDetails.alt_count,
    chrom,
    pos,
    ref: ref_allele,
    alt: alt_allele,
    allele_type: longReadDetails.allele_type,
    length,
  })

  return (
    <>
      <Section>
        <h2>Long-Read Variant Details</h2>
        <Table>
          <tbody>
            <tr>
              <th scope="row">Display allele ID</th>
              <td>{identity.label}</td>
            </tr>
            <tr>
              <th scope="row">Canonical browser ID</th>
              <td>
                <code>{variantId}</code>
              </td>
            </tr>
            {longReadDetails.source_variant_id && (
              <tr>
                <th scope="row">Source VCF record ID</th>
                <td>
                  <code>{longReadDetails.source_variant_id}</code>
                </td>
              </tr>
            )}
            {longReadDetails.alt_index != null && (
              <tr>
                <th scope="row">Source ALT allele</th>
                <td>
                  ALT {longReadDetails.alt_index}
                  {longReadDetails.alt_count != null ? ` of ${longReadDetails.alt_count}` : ''}
                </td>
              </tr>
            )}
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

      {isTandemRepeat && (
        <Section>
          <ExactTrAltMotifStructure refAllele={ref_allele} altAllele={alt_allele} motifs={motifs} />
        </Section>
      )}

      {allelic_series && allelic_series.length > 0 && (
        <Section>
          <h2>TR Allelic Series</h2>
          <p>
            Exact ALT allele-length differences and counts for this tandem-repeat record. This
            allelic series is distinct from the full-cohort repeat-count distributions below.
          </p>
          <TRDistributionPlot
            distribution={getAllelicSeriesDistribution(allelic_series)}
            yAxisLabel="Allele count"
            ariaLabel="TR ALT allele-length distribution"
          />
        </Section>
      )}

      {isTandemRepeat && (
        <ExpandedTrDistributions variantId={variantId} lrCohort={lrCohort} headingLevel="h2" />
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
              View parent TR: {formatLongReadVariantId(enveloping_tr_id)}
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
                  {formatLongReadVariantId(id)}
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
