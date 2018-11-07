// Element.prototype.matches and Element.prototype.closest are required by Grid

// https://developer.mozilla.org/en-US/docs/Web/API/Element/matches#Polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector
}

// https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#Polyfill
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    let el = this
    if (!document.documentElement.contains(el)) {
      return null
    }
    do {
      if (el.matches(s)) {
        return el
      }
      el = el.parentElement || el.parentNode
    } while (el !== null && el.nodeType === Node.ELEMENT_NODE)
    return null
  }
}
