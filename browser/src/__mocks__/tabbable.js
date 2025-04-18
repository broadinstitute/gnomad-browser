// tabbable, which is a dependency for focus-trap, isn't compatible with our testing library, so we mock it out.

// eslint-disable-next-line import/no-import-module-exports
import { jest } from '@jest/globals'

const lib = jest.requireActual('tabbable')
const tabbable = {
  ...lib,
  tabbable: (node, options) => lib.tabbable(node, { ...options, displayCheck: 'none' }),
  focusable: (node, options) => lib.focusable(node, { ...options, displayCheck: 'none' }),
  isFocusable: (node, options) => lib.isFocusable(node, { ...options, displayCheck: 'none' }),
  isTabbable: (node, options) => lib.isTabbable(node, { ...options, displayCheck: 'none' }),
}

module.exports = tabbable
