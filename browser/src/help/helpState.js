import EventEmitter from '../EventEmitter'

class HelpState extends EventEmitter {
  isOpen = false

  selectedTopic = null

  set(state) {
    if (Object.prototype.hasOwnProperty.call(state, 'isOpen')) {
      this.isOpen = state.isOpen
    }
    if (Object.prototype.hasOwnProperty.call(state, 'selectedTopic')) {
      this.selectedTopic = state.selectedTopic
    }

    this.emit('change', {
      isOpen: this.isOpen,
      selectedTopic: this.selectedTopic,
    })
  }
}

export default new HelpState()
