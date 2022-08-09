// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8008',
  },
})
