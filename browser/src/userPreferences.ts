class UserPreferencesStore {
  preferences = {}

  loadPreferences() {
    return new Promise((resolve: any, reject: any) => {
      try {
        // @ts-expect-error TS(2345) FIXME: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
        this.preferences = JSON.parse(localStorage.getItem('userPreferences')) || {}
        resolve()
      } catch (error) {
        reject(new Error('Unable to load preferences'))
      }
    })
  }

  getPreference(key: any) {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    return this.preferences[key]
  }

  savePreference(key: any, value: any) {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    this.preferences[key] = value
    return new Promise((resolve: any, reject: any) => {
      try {
        localStorage.setItem('userPreferences', JSON.stringify(this.preferences))
        resolve()
      } catch (error) {
        reject(new Error('Unable to save preference'))
      }
    })
  }
}

export default new UserPreferencesStore()
