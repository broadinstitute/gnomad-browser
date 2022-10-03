import { expect, describe, test } from '@jest/globals'
import { renderRoundedNumber } from './constraintMetrics'

describe('renderRoundedNumber', () => {
  test('returns the desired placeholder value if passed a null', () =>
    expect(renderRoundedNumber(null)).toEqual('—'))

  test('trims zeros when necessary', () =>
    expect(renderRoundedNumber(1.2, { precision: 15 })).toMatchSnapshot())

  test('uses proper highlight color', () =>
    expect(renderRoundedNumber(1.2, { highlightColor: '#ABCDEF' })).toMatchSnapshot())

  test('allows for arbitrary formatting of tooltip', () =>
    expect(
      renderRoundedNumber(1.2, {
        formatTooltip: (rounded) =>
          `I AM A ROUND NUMBER AS FOLLOWS: "${rounded}" THANK YOU FOR YOUR TIME`,
      })
    ).toMatchSnapshot())
})
