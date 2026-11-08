#!/usr/bin/env bash
#
# Remote deploy script. Runs ON THE SERVER, piped in over stdin by
# .github/workflows/ci-cd.yml. It receives these variables from a prelude the
# workflow prepends (never via argv, which `ps` exposes on shared hosting):
#
#   GH_PAT       token with read access to this private repo
#   REPO_URL     https://github.com/<owner>/<repo>.git
#   BRANCH       branch to deploy
#   DEPLOY_PATH  app directory on the server
#   APP_PORT     port the app listens on
#
set -e

: "${DEPLOY_PATH:?DEPLOY_PATH not set}"
: "${BRANCH:?BRANCH not set}"
: "${REPO_URL:?REPO_URL not set}"
APP_PORT="${APP_PORT:-3000}"

# 1) Load Node (nvm) - required in non-interactive shells.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 1b) Server survey. Prints how this account is wired up so the serving layer
#     (app root, port, Passenger vs plain node) can be matched without
#     guessing. Never prints secret VALUES - only variable names. Non-fatal.
set +e
echo "===== SERVER SURVEY (start) ====="
echo "--- identity ---"
whoami; echo "HOME=$HOME"
echo "--- node toolchain ---"
command -v node >/dev/null && node -v || echo "node: NOT FOUND"
command -v npm  >/dev/null && npm -v  || echo "npm: NOT FOUND"
command -v pm2  >/dev/null && echo "pm2: present" || echo "pm2: absent"
echo "--- home contents ---"
ls -la "$HOME" 2>/dev/null | head -30
echo "--- public_html ---"
ls -la "$HOME/public_html" 2>/dev/null | head -20 || echo "no public_html"
echo "--- cPanel/Passenger node app roots (nodevenv) ---"
ls -la "$HOME/nodevenv" 2>/dev/null || echo "no ~/nodevenv"
echo "--- .htaccess (Passenger directives reveal the app root) ---"
for f in "$HOME/public_html/.htaccess" "$HOME/.htaccess"; do
  [ -f "$f" ] && { echo "== $f =="; head -40 "$f"; }
done
echo "--- existing node processes ---"
ps -eo pid,etime,cmd 2>/dev/null | grep -i "[n]ode" | head -15
echo "--- listening ports ---"
{ ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null; } | head -20
echo "--- env var NAMES in \$HOME/.env (no values) ---"
[ -f "$HOME/.env" ] && grep -oE "^[A-Za-z0-9_]+" "$HOME/.env" | sort || echo "no $HOME/.env"
echo "===== SERVER SURVEY (end) ====="
set -e

# 2) Git credentials. The repo is private, so both the first clone and every
#    later fetch need auth. The token is never persisted: it goes into a 0600
#    file removed right after use (and again via an EXIT trap), and is never
#    placed on a command line.
if [ -z "${GH_PAT:-}" ]; then
  echo "ERROR: GH_PAT is empty - cannot reach the private repo." >&2
  exit 1
fi
CRED_FILE="$HOME/.git-credentials-ci.$$"
trap 'rm -f "$CRED_FILE"' EXIT INT TERM
umask 077
printf 'https://x-access-token:%s@github.com\n' "$GH_PAT" > "$CRED_FILE"
GIT_CRED=(-c "credential.helper=store --file=$CRED_FILE")

# 3) Bootstrap the checkout on first run, keep it in sync afterwards.
if [ ! -d "$DEPLOY_PATH/.git" ]; then
  echo "No checkout at $DEPLOY_PATH - cloning for the first time."
  mkdir -p "$DEPLOY_PATH"
  # Clone via a temp dir so an existing .env in the target is preserved.
  TMP_CLONE="$DEPLOY_PATH.tmp.$$"
  rm -rf "$TMP_CLONE"
  git "${GIT_CRED[@]}" clone "$REPO_URL" "$TMP_CLONE"
  mv "$TMP_CLONE/.git" "$DEPLOY_PATH/.git"
  rm -rf "$TMP_CLONE"
  cd "$DEPLOY_PATH"
  git reset --hard HEAD
else
  cd "$DEPLOY_PATH"
fi
git remote set-url origin "$REPO_URL"

# 3b) Environment file. .env is gitignored so it is never in the checkout, and
#     is commonly uploaded to the account home by mistake (that is where a file
#     manager opens). Adopt it from there. NEXT_PUBLIC_* are inlined at BUILD
#     time, so this must happen before npm run build.
if [ ! -f "$DEPLOY_PATH/.env" ] && [ -f "$HOME/.env" ]; then
  echo "Adopting $HOME/.env into $DEPLOY_PATH/.env"
  cp -p "$HOME/.env" "$DEPLOY_PATH/.env"
  chmod 600 "$DEPLOY_PATH/.env"
fi
if [ -f "$DEPLOY_PATH/.env" ]; then
  echo "env file present: $(grep -cE '^[A-Za-z0-9_]+=' "$DEPLOY_PATH/.env") variables set"
else
  echo "WARNING: no .env at $DEPLOY_PATH/.env - building in demo mode."
fi

# 4) Keep the tracked demo seed clean so checkout can never abort. Live demo
#    rows belong in calibiai_db.runtime.json (gitignored).
if [ -f calibiai_db.json ] && [ ! -f calibiai_db.runtime.json ]; then
  cp -f calibiai_db.json calibiai_db.runtime.json || true
fi
git checkout -- calibiai_db.json 2>/dev/null || true

git "${GIT_CRED[@]}" fetch origin
git checkout -B "$BRANCH" "origin/$BRANCH"
# Token no longer needed - drop it now rather than waiting for the EXIT trap,
# so it is absent from disk during the long build.
rm -f "$CRED_FILE"

# 5) Install deps (dev deps are REQUIRED to build Next.js) + build.
npm ci --include=dev

# Drop Next.js's persistent fetch Data Cache. A production build wraps global
# fetch in a caching one, so server-side GETs (Supabase REST + Auth included)
# were written here with a one-year revalidate and replayed from disk - which
# is why a redeploy never cleared a stale read. Only the fetch cache goes;
# webpack/swc caches stay so the build remains fast.
rm -rf .next/cache/fetch-cache || true

npm run build

# 6) Restart: kill the old server and let the host's supervisor respawn it
#    against the new build. The [ ] trick stops these patterns matching this
#    script itself.
pkill -f "next-serve[r]" || true
pkill -f "nex[t] start" || true
mkdir -p tmp && touch tmp/restart.txt || true
sleep 5
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:$APP_PORT/" || true)
echo "App HTTP status after restart: ${CODE:-000}"
case "$CODE" in
  2*|3*) echo "Deploy OK - app answering on port $APP_PORT" ;;
  *) echo "WARNING: app did not answer with 2xx/3xx (got ${CODE:-000}) on port $APP_PORT." ;;
esac
