import React from 'react'

import AttributeList, { AttributeListItem } from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { RepeatUnitClassification, ShortTandemRepeatReferenceRegion } from './ShortTandemRepeatPage'

type ShortTandemRepeatRepeatUnitsProps = {
  reference_repeat_unit: string
  repeat_units: RepeatUnit[]
}

const ShortTandemRepeatRepeatUnits = ({
  reference_repeat_unit,
  repeat_units,
}: ShortTandemRepeatRepeatUnitsProps) => {
  const repeatUnitsByClassification: Partial<Record<RepeatUnitClassification, string[]>> = {}
  repeat_units.forEach((repeatUnit) => {
    if (repeatUnitsByClassification[repeatUnit.classification] === undefined) {
      repeatUnitsByClassification[repeatUnit.classification] = []
    }
    repeatUnitsByClassification[repeatUnit.classification]!.push(repeatUnit.repeat_unit)
  })

  if (
    !repeatUnitsByClassification.pathogenic &&
    !repeatUnitsByClassification.benign &&
    repeatUnitsByClassification.unknown
  ) {
    return (
      <AttributeListItem
        label={`Repeat unit${repeatUnitsByClassification.unknown.length > 1 ? 's' : ''}`}
      >
        <InlineList
          items={repeatUnitsByClassification.unknown.map((repeatUnit: string) => (
            <span>
              {repeatUnit === reference_repeat_unit && repeat_units.length > 1
                ? `${repeatUnit} (reference)`
                : repeatUnit}
            </span>
          ))}
          label={`Repeat unit${repeatUnitsByClassification.unknown.length > 1 ? 's' : ''}`}
        />
      </AttributeListItem>
    )
  }

  if (
    repeatUnitsByClassification.pathogenic &&
    repeatUnitsByClassification.pathogenic.length === 1 &&
    !repeatUnitsByClassification.benign &&
    !repeatUnitsByClassification.unknown
  ) {
    return (
      <>
        {repeatUnitsByClassification.pathogenic && (
          <AttributeListItem
            label={`Repeat unit${repeatUnitsByClassification.pathogenic.length > 1 ? 's' : ''}`}
          >
            <InlineList
              items={repeatUnitsByClassification.pathogenic.map((repeatUnit: string) => (
                <span>
                  {repeatUnit === reference_repeat_unit && repeat_units.length > 1
                    ? `${repeatUnit} (reference)`
                    : repeatUnit}
                </span>
              ))}
              label={`Pathogenic repeat unit${
                repeatUnitsByClassification.pathogenic.length > 1 ? 's' : ''
              }`}
            />
          </AttributeListItem>
        )}
      </>
    )
  }

  return (
    <>
      {repeatUnitsByClassification.pathogenic && (
        <AttributeListItem
          label={`Pathogenic repeat unit${
            repeatUnitsByClassification.pathogenic.length > 1 ? 's' : ''
          }`}
          tooltip="These repeat units have been reported in the literature as pathogenic when they expand beyond a certain threshold."
        >
          <InlineList
            items={repeatUnitsByClassification.pathogenic.map((repeatUnit: string) => (
              <span>
                {repeatUnit === reference_repeat_unit && repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label={`Pathogenic repeat unit${
              repeatUnitsByClassification.pathogenic.length > 1 ? 's' : ''
            }`}
          />
        </AttributeListItem>
      )}
      {repeatUnitsByClassification.benign && (
        <AttributeListItem
          label={`Benign repeat unit${repeatUnitsByClassification.benign.length > 1 ? 's' : ''}`}
          tooltip="These repeat units are regarded in the literature as benign, even when expanded."
        >
          <InlineList
            items={repeatUnitsByClassification.benign.map((repeatUnit: string) => (
              <span>
                {repeatUnit === reference_repeat_unit && repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label={`Benign repeat unit${repeatUnitsByClassification.benign.length > 1 ? 's' : ''}`}
          />
        </AttributeListItem>
      )}
      {repeatUnitsByClassification.unknown && (
        <AttributeListItem
          label={`Other repeat unit${repeatUnitsByClassification.unknown.length > 1 ? 's' : ''}`}
          tooltip="These are the other repeat units detected at this locus within gnomAD samples by the call_non_ref_pathogenic_motifs.py script."
        >
          <InlineList
            items={repeatUnitsByClassification.unknown.map((repeatUnit: string) => (
              <span>
                {repeatUnit === reference_repeat_unit && repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label={`Other repeat unit${repeatUnitsByClassification.unknown.length > 1 ? 's' : ''}`}
          />
        </AttributeListItem>
      )}
    </>
  )
}

type RepeatUnit = {
  repeat_unit: string
  classification: RepeatUnitClassification
}

type Props = {
  gene?: null | {
    ensembl_id: string
    symbol: string
    region?: string
  }
  main_reference_region: ShortTandemRepeatReferenceRegion
  reference_repeat_unit: string
  repeat_units: RepeatUnit[]
}

const ShortTandemRepeatAttributes = ({
  gene,
  main_reference_region,
  reference_repeat_unit,
  repeat_units,
}: Props) => {
  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      {gene?.ensembl_id && gene.ensembl_id !== '' && (
        <AttributeListItem label="Gene">
          <Link to={`/gene/${gene.ensembl_id}`}>
            {gene.symbol !== '' ? gene.symbol : gene.ensembl_id}
          </Link>
        </AttributeListItem>
      )}
      {gene?.region && <AttributeListItem label="Gene region">{gene.region}</AttributeListItem>}
      <AttributeListItem label="Reference region">
        <Link
          to={`/region/${main_reference_region.chrom}-${main_reference_region.start}-${main_reference_region.stop}`}
        >
          {main_reference_region.chrom}:{main_reference_region.start}-{main_reference_region.stop}
        </Link>
      </AttributeListItem>
      <ShortTandemRepeatRepeatUnits
        reference_repeat_unit={reference_repeat_unit}
        repeat_units={repeat_units}
      />
    </AttributeList>
  )
}

export default ShortTandemRepeatAttributes
