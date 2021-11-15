import React from 'react'

import AttributeList from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatRepeatUnits = ({ shortTandemRepeat }) => {
  const repeatUnitsByClassification = {}
  shortTandemRepeat.repeat_units.forEach(repeatUnit => {
    if (repeatUnitsByClassification[repeatUnit.classification] === undefined) {
      repeatUnitsByClassification[repeatUnit.classification] = []
    }
    repeatUnitsByClassification[repeatUnit.classification].push(repeatUnit.repeat_unit)
  })

  if (!repeatUnitsByClassification.pathogenic && !repeatUnitsByClassification.benign) {
    return (
      <AttributeList.Item label="Repeat units">
        <InlineList
          items={repeatUnitsByClassification.unknown.map(repeatUnit => (
            <span>
              {repeatUnit === shortTandemRepeat.reference_repeat_unit
                ? `${repeatUnit} (reference)`
                : repeatUnit}
            </span>
          ))}
          label="Repeat units"
        />
      </AttributeList.Item>
    )
  }

  return (
    <>
      {repeatUnitsByClassification.pathogenic && (
        <AttributeList.Item label="Pathogenic repeat units">
          <InlineList
            items={repeatUnitsByClassification.pathogenic.map(repeatUnit => (
              <span>
                {repeatUnit === shortTandemRepeat.reference_repeat_unit
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label="Pathogenic repeat units"
          />
        </AttributeList.Item>
      )}
      {repeatUnitsByClassification.benign && (
        <AttributeList.Item label="Benign repeat units">
          <InlineList
            items={repeatUnitsByClassification.benign.map(repeatUnit => (
              <span>
                {repeatUnit === shortTandemRepeat.reference_repeat_unit
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label="Benign repeat units"
          />
        </AttributeList.Item>
      )}
      {repeatUnitsByClassification.unknown && (
        <AttributeList.Item label="Other repeat units">
          <InlineList
            items={repeatUnitsByClassification.unknown.map(repeatUnit => (
              <span>
                {repeatUnit === shortTandemRepeat.reference_repeat_unit
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </span>
            ))}
            label="Other repeat units"
          />
        </AttributeList.Item>
      )}
    </>
  )
}

ShortTandemRepeatRepeatUnits.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

const ShortTandemRepeatAttributes = ({ shortTandemRepeat }) => {
  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeList.Item label="Gene">
        <Link to={`/gene/${shortTandemRepeat.gene.ensembl_id}`}>
          {shortTandemRepeat.gene.symbol}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label="Gene region">{shortTandemRepeat.gene.region}</AttributeList.Item>
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${shortTandemRepeat.reference_region.chrom}-${shortTandemRepeat.reference_region.start}-${shortTandemRepeat.reference_region.stop}`}
        >
          {shortTandemRepeat.reference_region.chrom}-{shortTandemRepeat.reference_region.start}-
          {shortTandemRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
      <ShortTandemRepeatRepeatUnits shortTandemRepeat={shortTandemRepeat} />
    </AttributeList>
  )
}

ShortTandemRepeatAttributes.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

export default ShortTandemRepeatAttributes
