import React, { useState } from 'react'

import { Section, ResponsiveSection, FlexWrapper } from '../VariantPage/VariantPage'
import { ExternalLink, TooltipHint, TooltipAnchor, Badge } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import { LongReadVariant } from './LongReadVariantPage'
import TableWrapper from '../TableWrapper'
import sampleCounts from '@gnomad/dataset-metadata/datasets/gnomad-v4-lr/sampleCounts'
import { variantFeedbackUrl } from '../variantFeedback'
import { Table } from '../VariantPage/VariantOccurrenceTable'
import InfoButton from '../help/InfoButton'
import { PopulationsTable } from '../VariantPage/PopulationsTable'
import VariantTranscriptConsequences from '../VariantPage/VariantTranscriptConsequences'
import { addPopulationNames, nestPopulations } from '../VariantPage/GnomadPopulationsTable'
import Link from '../Link'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  AlleleSizeDistributionCohort,
  ColorBy,
  ScaleType,
} from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import {
  consolidateAlleleSizeDistributions,
  ColorByFn,
} from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'
import {
  allPopulations,
  logScaleAllowed,
  Sex,
} from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'
import ControlSection from '../VariantPage/ControlSection'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'
import ShortTandemRepeatPopulationOptions from '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatAttributes from '../ShortTandemRepeatPage/ShortTandemRepeatAttributes'

type Props = {
  datasetId: DatasetId
  variant: LongReadVariant
}

const ALLELE_TYPE_LABELS: Record<string, string> = {
  snv: 'SNV',
  ins: 'Insertion',
  del: 'Deletion',
  trv: 'Tandem Repeat',
  alu_ins: 'Alu Insertion',
  line1_ins: 'LINE-1 Insertion',
  sva_ins: 'SVA Insertion',
}

const LongReadVariantPageContent = ({ datasetId, variant }: Props) => {
  const isTR = variant.allele_type === 'trv'

  return (
    <FlexWrapper>
      {/* Identity & Attributes */}
      <ResponsiveSection>
        <TableWrapper>
          <LongReadVariantAttributeTable variant={variant} />
        </TableWrapper>
      </ResponsiveSection>
      <ResponsiveSection>
        <TableWrapper>
          <LongReadVariantOccurrenceTable variant={variant} />
        </TableWrapper>
      </ResponsiveSection>

      {/* External resources / related variants */}
      <ResponsiveSection>
        <h2>External Resources</h2>
        <LongReadVariantExternalResources datasetId={datasetId} variant={variant} />
      </ResponsiveSection>

      {/* Population frequencies */}
      <Section>
        <h2>
          Genetic Ancestry Group Frequencies <InfoButton topic="ancestry" />
        </h2>
        <LongReadVariantPopulationFrequencies variant={variant} />
      </Section>

      {/* Transcript consequences */}
      <Section>
        <h2>Ensembl Variant Effect Predictor</h2>
        {variant.transcript_consequences && variant.transcript_consequences.length > 0 ? (
          <VariantTranscriptConsequences variant={variant} />
        ) : (
          <p>No transcript consequence annotations available for this variant.</p>
        )}
      </Section>

      {/* TR-specific: reference region attributes */}
      {isTR && variant.main_reference_region && (
        <Section>
          <h2>Tandem Repeat Reference Region</h2>
          <ShortTandemRepeatAttributes
            reference_repeat_unit={variant.ref}
            repeat_units={[{ repeat_unit: variant.ref, classification: 'unknown' }]}
            main_reference_region={variant.main_reference_region}
          />
        </Section>
      )}

      {/* TR-specific: allele size distribution */}
      {isTR && variant.allele_size_distribution && (
        <Section>
          <LongReadAlleleSizeDistributionSection variant={variant} />
        </Section>
      )}

      {/* Overlapping variant calls (enveloped IDs) */}
      {variant.enveloped_ids && variant.enveloped_ids.length > 0 && (
        <Section>
          <h2>Overlapping Variant Calls</h2>
          <p>
            These variants were independently called within this repeat region and may be artifacts
            of repeat-length variation.
          </p>
          <ul>
            {variant.enveloped_ids.map((id: string) => (
              <li key={id}>
                <Link
                  to={`/variant/${id}?dataset=gnomad_r4_lr`}
                  preserveSelectedDataset={false}
                >
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </FlexWrapper>
  )
}

const LongReadVariantAttributeTable = ({ variant }: { variant: LongReadVariant }) => {
  const alleleTypeLabel = ALLELE_TYPE_LABELS[variant.allele_type] || variant.allele_type
  const hasSpan = variant.end != null && variant.length != null

  return (
    <Table>
      <tbody>
        <tr>
          <th scope="row">Allele Type</th>
          <td>{alleleTypeLabel}</td>
        </tr>
        <tr>
          <th scope="row">Position</th>
          <td>
            {variant.chrom}:{variant.pos}
            {hasSpan && ` - ${variant.end} (${variant.length!.toLocaleString()} bp)`}
          </td>
        </tr>
        {variant.allele_type === 'trv' && variant.motifs && variant.motifs.length > 0 ? (
          <tr>
            <th scope="row">Motifs</th>
            <td>{variant.motifs.join(', ')}</td>
          </tr>
        ) : (
          <>
            <tr>
              <th scope="row">Reference</th>
              <td style={{ wordBreak: 'break-all' }}>{variant.ref}</td>
            </tr>
            <tr>
              <th scope="row">Alternate</th>
              <td style={{ wordBreak: 'break-all' }}>{variant.alt}</td>
            </tr>
          </>
        )}
        {variant.enveloping_tr_id && (
          <tr>
            <th scope="row">Enveloping TR</th>
            <td>
              <Link
                to={`/variant/${variant.enveloping_tr_id}?dataset=gnomad_r4_lr`}
                preserveSelectedDataset={false}
              >
                {variant.enveloping_tr_id}
              </Link>
            </td>
          </tr>
        )}
      </tbody>
    </Table>
  )
}

const LongReadVariantOccurrenceTable = ({ variant }: { variant: LongReadVariant }) => {
  const hasLowAlleleNumber = variant.freq.all.an < sampleCounts.total / 2
  return (
    <div>
      <Table>
        <tbody>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Quality control filters that this variant failed (if any)">
                <TooltipHint>
                  Filters <InfoButton topic="what-do-the-flags-on-the-browser-mean" />
                </TooltipHint>
              </TooltipAnchor>
            </th>
            <td>
              <LongReadVariantFlag variant={variant} />
            </td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele count in high quality genotypes">
                <TooltipHint>Allele Count</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.freq.all.ac}</td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Total number of called high quality genotypes">
                <TooltipHint>Allele Number</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.freq.all.an}</td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele frequency in high quality genotypes">
                <TooltipHint>Allele Frequency</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.freq.all.af.toPrecision(4)}</td>
          </tr>
        </tbody>
      </Table>
      {hasLowAlleleNumber && (
        <p>
          <Badge level="error">Warning</Badge> This variant is covered in fewer than 50% of
          individuals. This may indicate a low-quality site.
        </p>
      )}
    </div>
  )
}

const LongReadVariantPopulationFrequencies = ({ variant }: { variant: LongReadVariant }) => {
  return (
    <TableWrapper>
      <PopulationsTable
        populations={nestPopulations(addPopulationNames(variant.freq.populations))}
      />
    </TableWrapper>
  )
}

const LongReadVariantExternalResources = ({
  datasetId,
  variant,
}: {
  datasetId: DatasetId
  variant: LongReadVariant
}) => {
  return (
    <div>
      {variant.short_read_match_id && (
        <p>
          <strong>Short-Read Match: </strong>
          <Link
            to={`/variant/${variant.short_read_match_id}?dataset=gnomad_r4`}
            preserveSelectedDataset={false}
          >
            {variant.short_read_match_id}
          </Link>
        </p>
      )}
      <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
        Report an issue with this variant
      </ExternalLink>
    </div>
  )
}

const LongReadVariantFlag = ({ variant }: { variant: LongReadVariant }) => {
  const filters = variant.filters || []
  if (filters.length === 0) {
    return <Badge level="success">Pass</Badge>
  }

  return (
    <>
      {filters.map((filter: string) => (
        <Badge key={filter} level="warning">
          {filter}
        </Badge>
      ))}
    </>
  )
}

// TR-specific: allele size distribution plot
const colorByFn: ColorByFn<AlleleSizeDistributionCohort> = (cohort, colorBy) => {
  if (colorBy === 'sex') {
    return cohort.sex
  }
  if (colorBy === 'population') {
    return cohort.ancestry_group
  }
  return null
}

const LongReadAlleleSizeDistributionSection = ({ variant }: { variant: LongReadVariant }) => {
  const { allele_size_distribution, max_repunits } = variant
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)

  const setSelectedColorBy = (newColorBy: ColorBy | null) => {
    if (selectedScaleType === 'log' && !logScaleAllowed(newColorBy)) {
      setSelectedScaleType('linear')
    }
    rawSetSelectedColorBy(newColorBy)
  }

  if (!allele_size_distribution || !max_repunits) {
    return null
  }

  const populations = allPopulations(allele_size_distribution)

  return (
    <>
      <h2>
        Allele Size Distribution <InfoButton topic="str-allele-size-distribution" />
      </h2>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={max_repunits}
        alleleSizeDistribution={consolidateAlleleSizeDistributions(
          allele_size_distribution,
          colorByFn,
          selectedPopulation,
          selectedSex,
          selectedColorBy,
          null,
          null
        )}
        colorBy={selectedColorBy}
        repeatUnitLength={null}
        scaleType={selectedScaleType}
      />
      <ControlSection style={{ marginTop: '0.5em' }}>
        <ShortTandemRepeatPopulationOptions
          id={`${variant.variant_id}-repeat-counts`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
        />
        <ShortTandemRepeatColorBySelect
          id={`${variant.variant_id}-color-by`}
          selectedColorBy={selectedColorBy}
          setSelectedColorBy={setSelectedColorBy}
          setSelectedScaleType={setSelectedScaleType}
          allowedColorBys={['sex', 'population']}
        />
        <ShortTandemRepeatScaleSelect
          id={variant.variant_id}
          selectedScaleType={selectedScaleType}
          setSelectedScaleType={setSelectedScaleType}
          selectedColorBy={selectedColorBy}
        />
      </ControlSection>
    </>
  )
}

export default LongReadVariantPageContent
