set -euo pipefail

cd "${DEPLOY_PATH}"

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
npm run build

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is not installed on the server. Install it with: npm install -g pm2"
  exit 1
fi

pm2 reload ifland-system --update-env || pm2 start npm --name ifland-system -- run start
pm2 save
