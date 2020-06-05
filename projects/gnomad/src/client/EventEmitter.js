class EventEmitter {
  callbacks = {}

  subscribe(name, cb) {
    if (!this.callbacks[name]) {
      this.callbacks[name] = []
    }

    this.callbacks[name].push(cb)
  }

  unsubscribe(name, cb) {
    if (!this.callbacks[name]) {
      return
    }

    this.callbacks[name] = this.callbacks[name].filter(fn => fn !== cb)
  }

  emit(name, value) {
    if (!this.callbacks[name]) {
      return
    }

    this.callbacks[name].forEach(cb => {
      cb(value)
    })
  }
}

export default EventEmitter
