import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'

import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatAttributes = ({ shortTandemRepeat }) => {
  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeList.Item label="Gene">
        <Link to={`/gene/${shortTandemRepeat.gene.ensembl_id}`}>
          {shortTandemRepeat.gene.symbol}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label="Gene region">{shortTandemRepeat.gene.region}</AttributeList.Item>
      <AttributeList.Item label="Repeat unit">{shortTandemRepeat.repeat_unit}</AttributeList.Item>
      <AttributeList.Item label="Reference region">
        <Link
          to={`/region/${shortTandemRepeat.reference_region.chrom}-${shortTandemRepeat.reference_region.start}-${shortTandemRepeat.reference_region.stop}`}
        >
          {shortTandemRepeat.reference_region.chrom}-{shortTandemRepeat.reference_region.start}-
          {shortTandemRepeat.reference_region.stop}
        </Link>
      </AttributeList.Item>
      <AttributeList.Item label="Inheritance mode">
        {shortTandemRepeat.inheritance_mode}
      </AttributeList.Item>
      <AttributeList.Item label="Associated disease">
        <ExternalLink
          href={`https://omim.org/entry/${shortTandemRepeat.associated_disease.omim_id}`}
        >
          {shortTandemRepeat.associated_disease.name}
        </ExternalLink>
      </AttributeList.Item>
      <AttributeList.Item label="Normal threshold">
        &le; {shortTandemRepeat.associated_disease.normal_threshold} repeats
      </AttributeList.Item>
      <AttributeList.Item label="Pathogenic threshold">
        &ge; {shortTandemRepeat.associated_disease.pathogenic_threshold} repeats
      </AttributeList.Item>
    </AttributeList>
  )
}

ShortTandemRepeatAttributes.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

export default ShortTandemRepeatAttributes
