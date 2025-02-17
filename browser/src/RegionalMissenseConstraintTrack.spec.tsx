import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'
import RegionalMissenseConstraintTrack, {
  RegionalMissenseConstraint,
  RegionalMissenseConstraintRegion,
} from './RegionalMissenseConstraintTrack'
import { Gene } from './GenePage/GenePage'
import geneFactory from './__factories__/Gene'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionViewerContext } from '@gnomad/region-viewer'

describe('RegionalMissenseConstraint', () => {
  const childProps = {
    centerPanelWidth: 500,
    isPositionDefined: true,
    leftPanelWidth: 100,
    rightPanelWidth: 50,
    scalePosition: (i: number) => i,
  }

  test('has no unexpected changes when the RMC has evidence and passed QC', () => {
    const regions: RegionalMissenseConstraintRegion[] = [
      {
        chrom: '1',
        start: 50,
        stop: 180,
        aa_start: null,
        aa_stop: null,
        obs_mis: 12,
        exp_mis: 34,
        obs_exp: 12.0 / 34.0,
        p_value: 0.45,
        z_score: 0.56,
        chisq_diff_null: undefined,
      },
      {
        chrom: '1',
        start: 250,
        stop: 400,
        aa_start: null,
        aa_stop: null,
        obs_mis: 13,
        exp_mis: 35,
        obs_exp: 13.0 / 35.0,
        p_value: 0.46,
        z_score: 0.57,
        chisq_diff_null: undefined,
      },
    ]
    const rmc: RegionalMissenseConstraint = { regions, has_no_rmc_evidence: false, passed_qc: true }

    const gene: Gene = geneFactory.build({
      chrom: '1',
      exons: [
        {
          feature_type: 'UTR',
          start: 1,
          stop: 123,
        },
        { feature_type: 'CDS', start: 124, stop: 234 },
        { feature_type: 'UTR', start: 235, stop: 345 },
        { feature_type: 'CDS', start: 346, stop: 456 },
        { feature_type: 'UTR', start: 457, stop: 567 },
        { feature_type: 'CDS', start: 568, stop: 678 },
        { feature_type: 'UTR', start: 679, stop: 789 },
      ],
    })

    const tree = renderer.create(
      <RegionViewerContext.Provider value={childProps}>
        <RegionalMissenseConstraintTrack regionalMissenseConstraint={rmc} gene={gene} />
      </RegionViewerContext.Provider>
    )
    expect(tree).toMatchSnapshot()
  })
})
