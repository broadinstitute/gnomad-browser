import React from 'react'

import { ExternalLink } from '@gnomad/ui'

import AttributeList from '../AttributeList'
import Link from '../Link'

import { ShortTandemRepeatPropType } from './ShortTandemRepeatPropTypes'

const ShortTandemRepeatLocusAttributes = ({ shortTandemRepeat }) => {
  return (
    <AttributeList style={{ marginTop: '1.25em' }}>
      <AttributeList.Item label="Gene">
        <Link to={`/gene/${shortTandemRepeat.gene.ensembl_id}`}>
          {shortTandemRepeat.gene.symbol}
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
      <AttributeList.Item label="Benign threshold">
        &le; {shortTandemRepeat.associated_disease.benign_threshold} repeats
      </AttributeList.Item>
      <AttributeList.Item label="Pathogenic threshold">
        &ge; {shortTandemRepeat.associated_disease.pathogenic_threshold} repeats
      </AttributeList.Item>
    </AttributeList>
  )
}

ShortTandemRepeatLocusAttributes.propTypes = {
  shortTandemRepeat: ShortTandemRepeatPropType.isRequired,
}

export default ShortTandemRepeatLocusAttributes
