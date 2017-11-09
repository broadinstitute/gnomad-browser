import { createStore, combineReducers, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import { createHelpReducer } from '../redux'

const config = {
  index: 'gnomad_help',
  tocFile: {
    toc: {
      sections: [
        {
          id: 'general',
          title: 'General information',
          children: [
            'about-gnomad',
            'data-usage',
          ]
        },
        {
          id: 'concepts',
          title: 'Concepts',
          children: [
            'variant-qc',
          ]
        }
      ]
    }
  }
}

const help = createHelpReducer(config)

export function createHelpStore() {
  return createStore(combineReducers({ help }), applyMiddleware(thunk))
}
