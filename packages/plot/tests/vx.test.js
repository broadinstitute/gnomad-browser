import test from 'tape'
import {
  appleStock as appleData,
  letterFrequency,
  genRandomNormalPoints,
  browserUsage,
  cityTemperature,
  groupDateValue,
} from '@vx/mock-data'

test('Mock data', (assert) => {
  assert.deepEqual(appleData.slice(0, 3), [{
    date: '2007-04-24T07:00:00.000Z',
    close: 93.24
  }, {
    date: '2007-04-25T07:00:00.000Z',
    close: 95.35
  }, {
    date: '2007-04-26T07:00:00.000Z',
    close: 98.84
  }],
  'Expected apple data')

  assert.deepEqual(letterFrequency.slice(0, 3), [
    { letter: 'A', frequency: 0.08167 },
    { letter: 'B', frequency: 0.01492 },
    { letter: 'C', frequency: 0.02782 },
  ],
  'Expected apple data')

  assert.equal(genRandomNormalPoints(3).length, 9)

  assert.deepEqual(browserUsage.slice(0, 3), [{ date: '2015 Jun 15',
    'Google Chrome': '48.09',
    'Internet Explorer': '24.14',
    Firefox: '18.82',
    Safari: '7.46',
    'Microsoft Edge': '0.03',
    Opera: '1.32',
    Mozilla: '0.12',
    'Other/Unknown': '0.01' },
  { date: '2015 Jun 16',
    'Google Chrome': '48',
    'Internet Explorer': '24.19',
    Firefox: '18.96',
    Safari: '7.36',
    'Microsoft Edge': '0.03',
    Opera: '1.32',
    Mozilla: '0.12',
    'Other/Unknown': '0.01' },
  { date: '2015 Jun 17',
    'Google Chrome': '47.87',
    'Internet Explorer': '24.44',
    Firefox: '18.91',
    Safari: '7.27',
    'Microsoft Edge': '0.03',
    Opera: '1.36',
    Mozilla: '0.12',
    'Other/Unknown': '0.01'
  }])

  assert.deepEqual(cityTemperature.slice(0, 3),
    [{ date: '20111001',
      'New York': '63.4',
      'San Francisco': '62.7',
      Austin: '72.2' },
    { date: '20111002',
      'New York': '58.0',
      'San Francisco': '59.9',
      Austin: '67.7' },
    { date: '20111003',
      'New York': '53.3',
      'San Francisco': '59.1',
      Austin: '69.4' }
    ])
  assert.end()
})