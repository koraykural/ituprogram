// pm2 app definition. deploy-release on the server runs
//   pm2 startOrReload /var/www/ituprogram.koraykural.com/current/ecosystem.config.cjs
// after switching `current` to a new release (see koraykural-infra). Secrets
// (DATABASE_URL) come from shared/.env, linked into each release as .env.
const fs = require('fs');
const path = require('path');

const cwd = '/var/www/ituprogram.koraykural.com/current';

// KEY=value lines from the release's .env (absent outside the server).
function dotenv(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

module.exports = {
  apps: [
    {
      name: 'ituprogram',
      // Through the `current` symlink, so a reload picks up the new release.
      cwd,
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      interpreter: 'none',
      max_memory_restart: '500M',
      env: {
        ...dotenv(path.join(cwd, '.env')),
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },
  ],
};
