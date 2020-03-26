// lodash's debounce doesn't work well with Jest's fake timers
// https://github.com/facebook/jest/issues/3465

const debounce = function (fn) {
  const debounced = function debounced(...args) {
    fn(...args)
  }
  debounced.cancel = jest.fn()
  return debounced
}

export default debounce
