import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import InlineList from '../InlineList'
import Link from '../Link'

import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatRepeatUnits = ({ shortTandemRepeat }) => {
  if (shortTandemRepeat.repeat_units.length === 1) {
    return (
      <AttributeList.Item label="Repeat unit">
        {shortTandemRepeat.repeat_units[0].repeat_unit} (
        {shortTandemRepeat.repeat_units[0].classification.charAt(0).toUpperCase() +
          shortTandemRepeat.repeat_units[0].classification.slice(1)}
        )
      </AttributeList.Item>
    )
  }

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
            <span>{repeatUnit}</span>
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
              <span>{repeatUnit}</span>
            ))}
            label="Pathogenic repeat units"
          />
        </AttributeList.Item>
      )}
      {repeatUnitsByClassification.benign && (
        <AttributeList.Item label="Benign repeat units">
          <InlineList
            items={repeatUnitsByClassification.benign.map(repeatUnit => (
              <span>{repeatUnit}</span>
            ))}
            label="Benign repeat units"
          />
        </AttributeList.Item>
      )}
      {repeatUnitsByClassification.unknown && (
        <AttributeList.Item label="Other repeat units">
          <InlineList
            items={repeatUnitsByClassification.unknown.map(repeatUnit => (
              <span>{repeatUnit}</span>
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
      <AttributeList.Item label="Reference repeat unit">
        {shortTandemRepeat.reference_repeat_unit}
      </AttributeList.Item>
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${shortTandemRepeat.reference_region.chrom}-${shortTandemRepeat.reference_region.start}-${shortTandemRepeat.reference_region.stop}`}
        >
          {shortTandemRepeat.reference_region.chrom}-{shortTandemRepeat.reference_region.start}-
          {shortTandemRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
      <ShortTandemRepeatRepeatUnits shortTandemRepeat={shortTandemRepeat} />
      <AttributeList.Item label="Inheritance mode">
        {shortTandemRepeat.inheritance_mode}
      </AttributeList.Item>
      <AttributeList.Item label="Associated disease">
        {shortTandemRepeat.associated_disease.omim_id ? (
          <ExternalLink
            href={`https://omim.org/entry/${shortTandemRepeat.associated_disease.omim_id}`}
          >
            {shortTandemRepeat.associated_disease.name}
          </ExternalLink>
        ) : (
          shortTandemRepeat.associated_disease.name
        )}
      </AttributeList.Item>
      {shortTandemRepeat.associated_disease.normal_threshold !== null && (
        <AttributeList.Item label="Normal range">
          &le; {shortTandemRepeat.associated_disease.normal_threshold} repeats
        </AttributeList.Item>
      )}
      {shortTandemRepeat.associated_disease.pathogenic_threshold !== null && (
        <AttributeList.Item label="Pathogenic range">
          &ge; {shortTandemRepeat.associated_disease.pathogenic_threshold} repeats
        </AttributeList.Item>
      )}
    </AttributeList>
  )
}

ShortTandemRepeatAttributes.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

export default ShortTandemRepeatAttributes
