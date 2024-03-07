import React from 'react'

import AttributeList, { AttributeListItem } from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeat } from './ShortTandemRepeatPage'

type ShortTandemRepeatRepeatUnitsProps = {
  shortTandemRepeat: ShortTandemRepeat
}

const ShortTandemRepeatRepeatUnits = ({ shortTandemRepeat }: ShortTandemRepeatRepeatUnitsProps) => {
  const repeatUnitsByClassification = {}
  shortTandemRepeat.repeat_units.forEach((repeatUnit) => {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    if (repeatUnitsByClassification[repeatUnit.classification] === undefined) {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      repeatUnitsByClassification[repeatUnit.classification] = []
    }
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    repeatUnitsByClassification[repeatUnit.classification].push(repeatUnit.repeat_unit)
  })

  if (
    !(repeatUnitsByClassification as any).pathogenic &&
    !(repeatUnitsByClassification as any).benign
  ) {
    return (
      <AttributeListItem
        label={`Repeat unit${(repeatUnitsByClassification as any).unknown.length > 1 ? 's' : ''}`}
      >
        <InlineList
          items={(repeatUnitsByClassification as any).unknown.map((repeatUnit: any) => (
            <span>
              {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
              shortTandemRepeat.repeat_units.length > 1
                ? `${repeatUnit} (reference)`
                : repeatUnit}
            </span>
          ))}
          label={`Repeat unit${(repeatUnitsByClassification as any).unknown.length > 1 ? 's' : ''}`}
        />
      </AttributeListItem>
    )
  }

  return (
    <>
      {(repeatUnitsByClassification as any).pathogenic && (
        <AttributeListItem
          label={`Pathogenic repeat unit${
            (repeatUnitsByClassification as any).pathogenic.length > 1 ? 's' : ''
          }`}
          tooltip="These repeat units have been reported in the literature as pathogenic when they expand beyond a certain threshold."
        >
          <InlineList
            items={(repeatUnitsByClassification as any).pathogenic.map((repeatUnit: any) => (
              <span>
                {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                shortTandemRepeat.repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label={`Pathogenic repeat unit${
              (repeatUnitsByClassification as any).pathogenic.length > 1 ? 's' : ''
            }`}
          />
        </AttributeListItem>
      )}
      {(repeatUnitsByClassification as any).benign && (
        <AttributeListItem
          label={`Benign repeat unit${
            (repeatUnitsByClassification as any).benign.length > 1 ? 's' : ''
          }`}
          tooltip="These repeat units are regarded in the literature as benign, even when expanded."
        >
          <InlineList
            items={(repeatUnitsByClassification as any).benign.map((repeatUnit: any) => (
              <span>
                {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                shortTandemRepeat.repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label={`Benign repeat unit${
              (repeatUnitsByClassification as any).benign.length > 1 ? 's' : ''
            }`}
          />
        </AttributeListItem>
      )}
      {(repeatUnitsByClassification as any).unknown && (
        <AttributeListItem
          label={`Other repeat unit${
            (repeatUnitsByClassification as any).unknown.length > 1 ? 's' : ''
          }`}
          tooltip="These are the other repeat units detected at this locus within gnomAD samples by the call_non_ref_pathogenic_motifs.py script."
        >
          <InlineList
            items={(repeatUnitsByClassification as any).unknown.map((repeatUnit: any) => (
              <span>
                {repeatUnit === shortTandemRepeat.reference_repeat_unit &&
                shortTandemRepeat.repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label={`Other repeat unit${
              (repeatUnitsByClassification as any).unknown.length > 1 ? 's' : ''
            }`}
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
          to={`/region/${shortTandemRepeat.reference_region.chrom}-${shortTandemRepeat.reference_region.start}-${shortTandemRepeat.reference_region.stop}`}
        >
          {shortTandemRepeat.reference_region.chrom}-{shortTandemRepeat.reference_region.start}-
          {shortTandemRepeat.reference_region.stop}
        </Link>
      </AttributeListItem>
      <ShortTandemRepeatRepeatUnits shortTandemRepeat={shortTandemRepeat} />
    </AttributeList>
  )
}

export default ShortTandemRepeatAttributes
