import { describe, test, expect } from '@jest/globals'
import { textOrMissingTextWarning } from './missingContent'

describe('textOrMissingTextWarning', () => {
  const labels = {
    foo: 'bar',
    baz: 'quux',
  }

  test('uses label from labels map if present', () => {
    expect(textOrMissingTextWarning('item', labels, 'foo')).toEqual('bar')
    expect(textOrMissingTextWarning('item', labels, 'baz')).toEqual('quux')
  })

  test('gives warning if requested label is missing', () => {
    expect(textOrMissingTextWarning('item', {}, 'foo')).toEqual('TEXT NEEDED FOR ITEM "foo"')
    expect(textOrMissingTextWarning('item', {}, 'baz')).toEqual('TEXT NEEDED FOR ITEM "baz"')
  })
})
