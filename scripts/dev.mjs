import { spawn } from 'node:child_process'
import { join } from 'node:path'

const commands = [
  [
    join(process.cwd(), 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    ['dev', '--port', '8787'],
  ],
  [
    join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js'),
    ['--host', '127.0.0.1', '--port', '5173'],
  ],
]

const processes = commands.map(([command, args]) =>
  spawn(process.execPath, [command, ...args], {
    cwd: process.cwd(),
    stdio: 'inherit',
  }),
)

function stopProcesses() {
  for (const process of processes) process.kill('SIGINT')
}

process.once('SIGINT', stopProcesses)
process.once('SIGTERM', stopProcesses)

for (const process of processes) {
  process.once('exit', (code) => {
    if (code && code !== 0) {
      stopProcesses()
      process.exitCode = code
    }
  })
}
