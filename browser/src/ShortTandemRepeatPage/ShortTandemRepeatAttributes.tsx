import React from 'react'

import AttributeList, { AttributeListItem } from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeat, RepeatUnitClassification } from './ShortTandemRepeatPage'

type ShortTandemRepeatRepeatUnitsProps = {
  shortTandemRepeat: ShortTandemRepeat
}

const ShortTandemRepeatRepeatUnits = ({ shortTandemRepeat }: ShortTandemRepeatRepeatUnitsProps) => {
  const repeatUnitsByClassification: Partial<Record<RepeatUnitClassification, string[]>> = {}
  shortTandemRepeat.repeat_units.forEach((repeatUnit) => {
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
              {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
              shortTandemRepeat.repeat_units.length > 1
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
                  {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                  shortTandemRepeat.repeat_units.length > 1
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
                {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                shortTandemRepeat.repeat_units.length > 1
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
                {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                shortTandemRepeat.repeat_units.length > 1
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
                {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                shortTandemRepeat.repeat_units.length > 1
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

type ShortTandemRepeatAttributesProps = {
  shortTandemRepeat: ShortTandemRepeat
}

const ShortTandemRepeatAttributes = ({ shortTandemRepeat }: ShortTandemRepeatAttributesProps) => {
  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeListItem label="Gene">
        <Link to={`/gene/${shortTandemRepeat.gene.ensembl_id}`}>
          {shortTandemRepeat.gene.symbol}
        </Link>
      </AttributeListItem>
      <AttributeListItem label="Gene region">{shortTandemRepeat.gene.region}</AttributeListItem>
      <AttributeListItem label="Reference region">
        <Link
          to={`/region/${shortTandemRepeat.main_reference_region.chrom}-${shortTandemRepeat.main_reference_region.start}-${shortTandemRepeat.main_reference_region.stop}`}
        >
          {shortTandemRepeat.main_reference_region.chrom}:
          {shortTandemRepeat.main_reference_region.start}-
          {shortTandemRepeat.main_reference_region.stop}
        </Link>
      </AttributeListItem>
      <ShortTandemRepeatRepeatUnits shortTandemRepeat={shortTandemRepeat} />
    </AttributeList>
  )
}

export default ShortTandemRepeatAttributes
