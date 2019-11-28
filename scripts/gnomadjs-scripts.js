#!/usr/bin/env node

const { spawnSync } = require('child_process')

process.on('unhandledRejection', err => {
  throw err
})

const args = process.argv.slice(2)

const script = args[0]
const scriptArgs = args.slice(1)

const result = spawnSync('node', [require.resolve(`./scripts/${script}`), ...scriptArgs], {
  stdio: 'inherit',
})
if (result.signal) {
  process.exit(1)
}
process.exit(result.status)
