'use strict';

/**
 * Test-only preload (node --require). Any attempt to open a socket, resolve a
 * DNS name or spawn a process makes the process exit with code 99 and a clear
 * marker. src/integration-database-guard.spec.ts runs the integration scripts
 * under it to prove that a refused configuration fails BEFORE any network
 * access or API-server startup (exit code 2 from the guard, never 99).
 */
const net = require('node:net');
const dns = require('node:dns');
const childProcess = require('node:child_process');

const BLOCKED_EXIT_CODE = 99;

function trip(what) {
  process.stderr.write(`NETWORK_OR_SPAWN_ATTEMPTED: ${what}\n`);
  process.exit(BLOCKED_EXIT_CODE);
}

net.Socket.prototype.connect = function connect() {
  trip('net.Socket.connect');
};
for (const name of ['lookup', 'resolve', 'resolve4', 'resolve6']) {
  if (typeof dns[name] === 'function') {
    dns[name] = () => trip(`dns.${name}`);
  }
}
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  childProcess[name] = () => trip(`child_process.${name}`);
}
