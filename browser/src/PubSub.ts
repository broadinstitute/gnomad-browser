class PubSub {
  callbacks = []

  subscribe(callback: any) {
    // @ts-expect-error TS(2345) FIXME: Argument of type 'any' is not assignable to parame... Remove this comment to see the full error message
    this.callbacks.push(callback)
  }

  unsubscribe(callback: any) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback)
  }

  publish(obj: any) {
    this.callbacks.forEach((cb) => {
      // @ts-expect-error TS(2349) FIXME: This expression is not callable.
      cb(obj)
    })
  }
}

export default PubSub
