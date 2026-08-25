import { spawnSync } from 'node:child_process';

const command = process.platform === 'win32' ? 'next.cmd' : 'next';
const result = spawnSync(command, ['build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    GITHUB_PAGES: 'true',
  },
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
