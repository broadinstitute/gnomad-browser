export class UserVisibleError extends Error {
  constructor(...args) {
    super(...args)
    this.name = 'UserVisibleError'
    this.extensions = {
      isUserVisible: true,
    }
  }
}
