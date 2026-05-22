set -euo pipefail

cd "${DEPLOY_PATH}"

if [ -n "${NODE_VERSION:-}" ] && [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # GitHub Actions SSH commands run in a non-interactive shell.
  # Load nvm explicitly so this app can use a different Node version from
  # other services on the same server.
  . "${HOME}/.nvm/nvm.sh"
  nvm use "${NODE_VERSION}"
  hash -r
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed on the server."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed on the server."
  exit 1
fi

if [ ! -f .env.local ]; then
  echo ".env.local is missing in $PWD. Create it on the server before deploying."
  exit 1
fi

npm ci
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed on the server. Install it with: npm install -g pm2"
  exit 1
fi

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 delete "${APP_NAME}"
fi

rm -rf .next
npm run build

export PORT="${APP_PORT}"
pm2 start npm --name "${APP_NAME}" -- run start
pm2 save
