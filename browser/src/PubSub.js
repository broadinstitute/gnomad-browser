class PubSub {
  callbacks = []

  subscribe(callback) {
    this.callbacks.push(callback)
  }

  unsubscribe(callback) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback)
  }

  publish(obj) {
    this.callbacks.forEach(cb => {
      cb(obj)
    })
  }
}

export default PubSub
