/* eslint-disable camelcase */
/* eslint-disable no-param-reassign */
/* eslint-disable quote-props */
/* eslint-disable quotes */
import test from 'tape'  // eslint-disable-line
import data from '@resources/1505910855-variantfx-myh7.json'  // eslint-disable-line

import {
  getConsequenceBreakdown,
  sumCohorts,
  burdenCalculations,
} from '../src/utilities'

test('getConsequenceBreakdown', (assert) => {
  const expected = {
    all: {
      OMG: [
        454, // ac
        1363200 // an
      ],
      LMM: [
        466,
        1217216
      ],
      SGP: [
        379,
        36500
      ],
      EGY: [
        0,
        0
      ],
      RBH: [
        2682,
        202430
      ]
    },
    lof: {
      OMG: [
        2,
        12800
      ],
      LMM: [
        1,
        5824
      ],
      SGP: [
        0,
        624
      ],
      EGY: [
        0,
        0
      ],
      RBH: [
        4,
        5362
      ]
    },
    missense: {
      OMG: [
        420,
        1235200
      ],
      LMM: [
        432,
        1089088
      ],
      SGP: [
        18,
        9360
      ],
      EGY: [
        0,
        0
      ],
      RBH: [
        66,
      ]
    }
  }
  const breakdown = getConsequenceBreakdown(data.variants, 'HCM')
  assert.deepEqual(expected, breakdown)
  assert.end()
})

test('sum cohorts.', (assert) => {
  const cohortBreakdowns = getConsequenceBreakdown(data.variants, 'HCM')
  const numeratorsByCategory = sumCohorts(cohortBreakdowns)
  const expected = {
    all: 0.0014120295983536606,
    lof: 0.0002844372206420154,
    missense: 0.0003895799030045934,
  }
  assert.deepEqual(expected, numeratorsByCategory)
  assert.end()
})


test('odds ratio, ef', (assert) => {
  const cohortBreakdowns = getConsequenceBreakdown(data.variants, 'HCM')
  const healthyBreakdowns = getConsequenceBreakdown(data.variants, 'HVO')
  const calculations = burdenCalculations(cohortBreakdowns, healthyBreakdowns)
  const expected = {
    missense: {
      odds_ratio: 1.35530952456268,
      ef: 0.2621611654926784
    },
    lof: {
      odds_ratio: 0.8952945956928077,
      ef: -0.11695078336328829
    },
    all: {
      odds_ratio: 0.12503734865004978,
      ef: -6.997610400383373
    }
  }

  assert.deepEqual(expected, calculations)
  // console.log(JSON.stringify(calculations, null, '\t'))
  assert.end()
})
