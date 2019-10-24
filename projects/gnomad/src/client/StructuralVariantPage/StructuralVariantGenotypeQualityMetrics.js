import React, { useState } from 'react'

import { SegmentedControl } from '@broad/ui'

import Histogram from '../Histogram'
import ControlSection from '../VariantPage/ControlSection'
import StructuralVariantDetailPropType from './StructuralVariantDetailPropType'

const StructuralVariantGenotypeQualityMetrics = ({ variant }) => {
  const [selectedSamples, setSelectedSamples] = useState('all') // 'all' or 'alt'

  const histogramData = variant.genotype_quality[selectedSamples]

  return (
    <div>
      <Histogram
        barColor="#73ab3d"
        binEdges={histogramData.bin_edges}
        binValues={histogramData.bin_freq}
        nLarger={histogramData.n_larger}
        xLabel="Genotype Quality"
        yLabel={selectedSamples === 'all' ? 'All individuals' : 'Variant carriers'}
      />

      <ControlSection>
        <SegmentedControl
          id="genotype-quality-metrics-sample"
          onChange={setSelectedSamples}
          options={[{ label: 'All', value: 'all' }, { label: 'Variant Carriers', value: 'alt' }]}
          value={selectedSamples}
        />
      </ControlSection>
    </div>
  )
}

StructuralVariantGenotypeQualityMetrics.propTypes = {
  variant: StructuralVariantDetailPropType.isRequired,
}

export default StructuralVariantGenotypeQualityMetrics
