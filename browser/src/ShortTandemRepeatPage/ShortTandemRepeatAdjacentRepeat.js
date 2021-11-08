import { max, min } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

import { Modal, Select } from '@gnomad/ui'

import ControlSection from '../VariantPage/ControlSection'

import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import { ShortTandemRepeatAdjacentRepeatPropType } from './ShortTandemRepeatPropTypes'
import ShortTandemRepeatAlleleSizeDistributionPlot from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from './ShortTandemRepeatGenotypeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionBinDetails from './ShortTandemRepeatGenotypeDistributionBinDetails'
import ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect from './ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect'
import ShortTandemRepeatAdjacentRepeatAttributes from './ShortTandemRepeatAdjacentRepeatAttributes'
import {
  getSelectedAlleleSizeDistribution,
  getSelectedGenotypeDistribution,
  getGenotypeDistributionPlotAxisLabels,
} from './shortTandemRepeatHelpers'

const ShortTandemRepeatAdjacentRepeat = ({
  adjacentRepeat,
  populationIds,
  selectedPopulationId,
  onSelectPopulationId,
  selectedScaleType,
  onSelectScaleType,
}) => {
  const [selectedRepeatUnit, setSelectedRepeatUnit] = useState(
    adjacentRepeat.repeat_units.length === 1 ? adjacentRepeat.repeat_units[0] : ''
  )

  const [
    selectedGenotypeDistributionRepeatUnits,
    setSelectedGenotypeDistributionRepeatUnits,
  ] = useState(
    adjacentRepeat.genotype_distribution.repeat_units.length === 1
      ? adjacentRepeat.genotype_distribution.repeat_units[0].repeat_units.join(' / ')
      : ''
  )

  const [selectedGenotypeDistributionBin, setSelectedGenotypeDistributionBin] = useState(null)

  return (
    <section style={{ marginBottom: '2em' }}>
      <h3>{adjacentRepeat.id}</h3>
      <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />

      <h4>Allele Size Distribution</h4>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={
          adjacentRepeat.allele_size_distribution.distribution[
            adjacentRepeat.allele_size_distribution.distribution.length - 1
          ][0]
        }
        alleleSizeDistribution={getSelectedAlleleSizeDistribution(adjacentRepeat, {
          selectedPopulationId,
          selectedRepeatUnit,
        })}
        repeatUnitLength={selectedRepeatUnit ? selectedRepeatUnit.length : null}
        scaleType={selectedScaleType}
      />
      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-repeat-counts`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={onSelectPopulationId}
        />

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}>
          Repeat unit:{' '}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}
            value={selectedRepeatUnit}
            onChange={e => {
              setSelectedRepeatUnit(e.target.value)
            }}
          >
            {adjacentRepeat.repeat_units.length > 1 && <option value="">All</option>}
            {adjacentRepeat.repeat_units.map(repeatUnit => (
              <option key={repeatUnit} value={repeatUnit}>
                {repeatUnit === adjacentRepeat.reference_repeat_unit
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </option>
            ))}
          </Select>
        </label>

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}>
          Scale:{' '}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}
            value={selectedScaleType}
            onChange={e => {
              onSelectScaleType(e.target.value)
            }}
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
          </Select>
        </label>
      </ControlSection>

      <h4>Genotype Distribution</h4>
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={getGenotypeDistributionPlotAxisLabels(adjacentRepeat, {
          selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
        })}
        maxRepeats={[
          max(adjacentRepeat.genotype_distribution.distribution, d => max(d.slice(0, 2))),
          max(adjacentRepeat.genotype_distribution.distribution, d => min(d.slice(0, 2))),
        ]}
        genotypeDistribution={getSelectedGenotypeDistribution(adjacentRepeat, {
          selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
          selectedPopulationId,
        })}
        onSelectBin={bin => {
          if (bin.xRange[0] !== bin.xRange[1] || bin.yRange[0] !== bin.yRange[1]) {
            setSelectedGenotypeDistributionBin(bin)
          }
        }}
      />

      <ControlSection>
        <ShortTandemRepeatPopulationOptions
          id={`${adjacentRepeat.id}-genotype-distribution`}
          populationIds={populationIds}
          selectedPopulationId={selectedPopulationId}
          onSelectPopulationId={onSelectPopulationId}
        />

        <ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
          shortTandemRepeatOrAdjacentRepeat={adjacentRepeat}
          value={selectedGenotypeDistributionRepeatUnits}
          onChange={setSelectedGenotypeDistributionRepeatUnits}
        />
      </ControlSection>

      {selectedGenotypeDistributionBin && (
        <Modal
          title={selectedGenotypeDistributionBin.label}
          size="large"
          initialFocusOnButton={false}
          onRequestClose={() => {
            setSelectedGenotypeDistributionBin(null)
          }}
        >
          <ShortTandemRepeatGenotypeDistributionBinDetails
            shortTandemRepeatOrAdjacentRepeat={adjacentRepeat}
            selectedPopulationId={selectedPopulationId}
            selectedRepeatUnits={selectedGenotypeDistributionRepeatUnits}
            bin={selectedGenotypeDistributionBin}
          />
        </Modal>
      )}
    </section>
  )
}

ShortTandemRepeatAdjacentRepeat.propTypes = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType.isRequired,
  populationIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedPopulationId: PropTypes.string.isRequired,
  onSelectPopulationId: PropTypes.func.isRequired,
  selectedScaleType: PropTypes.string.isRequired,
  onSelectScaleType: PropTypes.func.isRequired,
}

export default ShortTandemRepeatAdjacentRepeat
