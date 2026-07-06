import React from 'react'
import renderer from 'react-test-renderer'
import { describe, expect, test } from '@jest/globals'
import RegionalMissenseConstraintTrack, {
  RegionalMissenseConstraint,
  RegionalMissenseConstraintRegion,
} from './RegionalMissenseConstraintTrack'
import { Gene } from './GenePage/GenePage'
import geneFactory from './__factories__/Gene'

describe('RegionalMissenseConstraint', () => {
  test('has no unexpected changes when the RMC object has evidence and regions', () => {
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
        low_coverage: true,
        percentile: '<=1',
        no_color: true,
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
        low_coverage: false,
        percentile: '<=1',
        no_color: true,
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
        p_value: 1.23e-5,
        z_score: 0.57,
        chisq_diff_null: undefined,
        low_coverage: false,
        percentile: '<=1',
        no_color: false,
      },
    ]

    const rmc: RegionalMissenseConstraint = {
      has_no_rmc_evidence: false,
      is_outlier: false,
      is_outlier_no_display: false,
      regions,
    }

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
      <RegionalMissenseConstraintTrack regionalMissenseConstraint={rmc} gene={gene} />
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes when the RMC object has evidence and regions and is an outlier', () => {
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
        low_coverage: true,
        percentile: '<=1',
        no_color: true,
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
        low_coverage: false,
        percentile: '<=1',
        no_color: true,
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
        p_value: 1.23e-5,
        z_score: 0.57,
        chisq_diff_null: undefined,
        low_coverage: false,
        percentile: '<=1',
        no_color: false,
      },
    ]

    const rmc: RegionalMissenseConstraint = {
      has_no_rmc_evidence: false,
      is_outlier: true,
      is_outlier_no_display: false,
      regions,
    }

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
      <RegionalMissenseConstraintTrack regionalMissenseConstraint={rmc} gene={gene} />
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes when the RMC object has evidence and regions and is an outlier that shoudnt be rendered', () => {
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
        low_coverage: true,
        percentile: '<=1',
        no_color: true,
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
        low_coverage: false,
        percentile: '<=1',
        no_color: true,
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
        p_value: 1.23e-5,
        z_score: 0.57,
        chisq_diff_null: undefined,
        low_coverage: false,
        percentile: '<=1',
        no_color: false,
      },
    ]

    const rmc: RegionalMissenseConstraint = {
      has_no_rmc_evidence: false,
      is_outlier: true,
      is_outlier_no_display: true,
      regions,
    }

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
      <RegionalMissenseConstraintTrack regionalMissenseConstraint={rmc} gene={gene} />
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes when RMC object has no evidence', () => {
    const rmc: RegionalMissenseConstraint = {
      has_no_rmc_evidence: true,
      is_outlier: false,
      is_outlier_no_display: false,
      regions: [],
    }

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
      gnomad_constraint: {
        exp_lof: 62.116009290752274,
        exp_mis: 959.7871924342421,
        exp_syn: 409.3918482855569,
        obs_lof: 57,
        obs_mis: 870,
        obs_syn: 387,
        oe_lof: 0.9176378304213768,
        oe_lof_lower: 0.7416265467075939,
        oe_lof_upper: 1.1441346736692857,
        oe_lof_percentile: 52,
        oe_mis: 0.906450937101462,
        oe_mis_lower: 0.857514089563757,
        oe_mis_upper: 0.9586561741086429,
        oe_syn: 0.9453046063830313,
        oe_syn_lower: 0.8700186318667248,
        oe_syn_upper: 1.028252849618702,
        lof_z: 0.5506733800624035,
        mis_z: 1.2360458676592712,
        syn_z: 0.6603188478981497,
        pLI: 2.765187110917745e-18,
        flags: [],
      },
    })

    const tree = renderer.create(
      <RegionalMissenseConstraintTrack regionalMissenseConstraint={rmc} gene={gene} />
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes when RMC object has not been searched', () => {
    const rmc: RegionalMissenseConstraint = {
      has_no_rmc_evidence: null,
      is_outlier: false,
      is_outlier_no_display: false,
      regions: [],
    }

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
      gnomad_constraint: {
        exp_lof: 62.116009290752274,
        exp_mis: 959.7871924342421,
        exp_syn: 409.3918482855569,
        obs_lof: 57,
        obs_mis: 870,
        obs_syn: 387,
        oe_lof: 0.9176378304213768,
        oe_lof_lower: 0.7416265467075939,
        oe_lof_upper: 1.1441346736692857,
        oe_lof_percentile: 52,
        oe_mis: 0.906450937101462,
        oe_mis_lower: 0.857514089563757,
        oe_mis_upper: 0.9586561741086429,
        oe_syn: 0.9453046063830313,
        oe_syn_lower: 0.8700186318667248,
        oe_syn_upper: 1.028252849618702,
        lof_z: 0.5506733800624035,
        mis_z: 1.2360458676592712,
        syn_z: 0.6603188478981497,
        pLI: 2.765187110917745e-18,
        flags: [],
      },
    })

    const tree = renderer.create(
      <RegionalMissenseConstraintTrack regionalMissenseConstraint={rmc} gene={gene} />
    )
    expect(tree).toMatchSnapshot()
  })
})
