import Mousetrap from 'mousetrap'
import PropTypes from 'prop-types'
import { useEffect } from 'react'

// Mousetrap doesn't provide a way to remove individual callbacks without unbinding all
// callbacks for a key sequence.
// Wrap it to provide that functionality.
class MousetrapWrapper {
  callbacks = {}

  constructor() {
    this.mousetrap = new Mousetrap()
  }

  onKeys = (e, keys) => {
    this.callbacks[keys].forEach(cb => {
      cb(e, keys)
    })
  }

  bind(keys, callback) {
    if (!this.callbacks[keys]) {
      this.callbacks[keys] = []
      this.mousetrap.bind(keys, this.onKeys)
    }

    this.callbacks[keys].push(callback)
  }

  unbind(keys, callback) {
    if (callback) {
      this.callbacks[keys] = this.callbacks[keys].filter(cb => cb !== callback)
    } else {
      this.callbacks[keys] = []
    }

    if (this.callbacks[keys].length === 0) {
      this.mousetrap.unbind(keys)
      this.callbacks[keys] = null
    }
  }
}

const mousetrap = new MousetrapWrapper()

export const KeyboardShortcut = ({ handler, keys }) => {
  useEffect(
    () => {
      mousetrap.bind(keys, handler)
      return () => {
        mousetrap.unbind(keys, handler)
      }
    },
    [handler, keys]
  )
  return null
}

KeyboardShortcut.propTypes = {
  handler: PropTypes.func.isRequired,
  keys: PropTypes.string.isRequired,
}
