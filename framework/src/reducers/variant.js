const variant = (state = {}, action) => {
  switch (action.type) {
    case 'RECEIVE_VARIANT':
      return action.data
    default:
      return state
  }
}

export default variant
