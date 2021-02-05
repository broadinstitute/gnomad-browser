class UserPreferencesStore {
  preferences = {}

  loadPreferences() {
    return new Promise((resolve, reject) => {
      try {
        this.preferences = JSON.parse(localStorage.getItem('userPreferences')) || {}
        resolve()
      } catch (error) {
        reject(new Error('Unable to load preferences'))
      }
    })
  }

  getPreference(key) {
    return this.preferences[key]
  }

  savePreference(key, value) {
    this.preferences[key] = value
    return new Promise((resolve, reject) => {
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
