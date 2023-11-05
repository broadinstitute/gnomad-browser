export class UserVisibleError extends Error {
  extensions: any

  constructor(...args: any[]) {
    super(...args)
    this.name = 'UserVisibleError'
    this.extensions = {
      isUserVisible: true,
    }
  }
}
