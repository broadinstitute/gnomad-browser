import { max, min } from 'd3-array'
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

type Props = {
  adjacentRepeat: ShortTandemRepeatAdjacentRepeatPropType
  populationIds: string[]
  selectedPopulationId: string
  onSelectPopulationId: (...args: any[]) => any
  selectedScaleType: string
  onSelectScaleType: (...args: any[]) => any
}

const ShortTandemRepeatAdjacentRepeat = ({
  adjacentRepeat,
  populationIds,
  selectedPopulationId,
  onSelectPopulationId,
  selectedScaleType,
  onSelectScaleType,
}: Props) => {
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
    <section style={{ marginBottom: '3em' }}>
      <h3>{adjacentRepeat.id}</h3>
      <ShortTandemRepeatAdjacentRepeatAttributes adjacentRepeat={adjacentRepeat} />

      <h4 style={{ marginBottom: '0.66em' }}>Allele Size Distribution</h4>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        // @ts-expect-error TS(2322) FIXME: Type '{ maxRepeats: number; alleleSizeDistribution... Remove this comment to see the full error message
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
          Repeat unit: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-unit`}
            value={selectedRepeatUnit}
            onChange={(e: any) => {
              setSelectedRepeatUnit(e.target.value)
            }}
          >
            {adjacentRepeat.repeat_units.length > 1 && <option value="">All</option>}
            {adjacentRepeat.repeat_units.map((repeatUnit) => (
              <option key={repeatUnit} value={repeatUnit}>
                {repeatUnit === adjacentRepeat.reference_repeat_unit &&
                adjacentRepeat.repeat_units.length > 1
                  ? `${repeatUnit} (reference)`
                  : repeatUnit}
              </option>
            ))}
          </Select>
        </label>

        <label htmlFor={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}>
          Scale: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id={`short-tandem-repeat-${adjacentRepeat.id}-repeat-counts-scale`}
            value={selectedScaleType}
            onChange={(e: any) => {
              onSelectScaleType(e.target.value)
            }}
          >
            <option value="linear">Linear</option>
            <option value="log">Log</option>
          </Select>
        </label>
      </ControlSection>

      <h4 style={{ marginBottom: '0.66em' }}>Genotype Distribution</h4>
      <ShortTandemRepeatGenotypeDistributionPlot
        // @ts-expect-error TS(2322) FIXME: Type '{ axisLabels: any; maxRepeats: (string | und... Remove this comment to see the full error message
        axisLabels={getGenotypeDistributionPlotAxisLabels(adjacentRepeat, {
          selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
        })}
        maxRepeats={[
          max(adjacentRepeat.genotype_distribution.distribution, (d: any) => max(d.slice(0, 2))),
          max(adjacentRepeat.genotype_distribution.distribution, (d: any) => min(d.slice(0, 2))),
        ]}
        genotypeDistribution={getSelectedGenotypeDistribution(adjacentRepeat, {
          selectedRepeatUnits: selectedGenotypeDistributionRepeatUnits,
          selectedPopulationId,
        })}
        onSelectBin={(bin: any) => {
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
          title={(selectedGenotypeDistributionBin as any).label}
          size="large"
          // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; title: any; size: "larg... Remove this comment to see the full error message
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

export default ShortTandemRepeatAdjacentRepeat
