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

# 4) Preserve the live demo rows before the tree is reset. calibiai_db.json is
#    only the seed that ships in git; the rows this deployment accumulated
#    belong in calibiai_db.runtime.json, which is gitignored and so survives
#    everything below.
if [ -f calibiai_db.json ] && [ ! -f calibiai_db.runtime.json ]; then
  cp -f calibiai_db.json calibiai_db.runtime.json || true
fi

# 4b) Sync the checkout to the branch.
#
#     `git checkout -B` REFUSES to switch when a tracked file has local
#     modifications that the incoming commit also touches, and takes the whole
#     deploy down with it:
#
#       error: Your local changes to the following files would be overwritten
#              by checkout:  next-env.d.ts
#       Aborting
#
#     That is structural here, not bad luck. `npm run build` (step 5) makes
#     Next REGENERATE tracked files - next-env.d.ts is rewritten on every
#     build - so this checkout is guaranteed to be dirty from the second
#     deploy onwards. It stayed quiet only while incoming commits happened not
#     to touch the same files; the moment one did, every later deploy aborted.
#     The old `git checkout -- calibiai_db.json` line treated one known file
#     the same way, which is whack-a-mole: it cannot know the next filename.
#
#     A deploy target is a disposable mirror of the branch, not a working copy
#     with opinions, so discard local state unconditionally. `reset --hard`
#     never refuses. It is run BEFORE the branch switch so the switch itself
#     always has a clean tree to work with.
#
#     Only tracked files are touched. Ignored files - .env, .next,
#     node_modules, calibiai_db.runtime.json - are left alone, because there
#     is deliberately no `git clean -x` here.
git "${GIT_CRED[@]}" fetch --prune origin
git reset --hard "origin/$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
echo "checkout synced to $(git rev-parse --short HEAD) on $BRANCH"
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

# 6) Restart. This hosting account runs MORE THAN ONE app (calibiUpx and
#    CalibiAiRevamp share it on different domains), so a blanket
#    `pkill -f "next start"` would take the neighbour down too. Everything
#    below is scoped to this app only: a pidfile we own, or a uniquely named
#    PM2 process.
export PORT="$APP_PORT"
export PM2_APP_NAME="${PM2_APP_NAME:-calibiupx}"
mkdir -p tmp logs

if command -v pm2 >/dev/null 2>&1; then
  echo "Restarting via PM2 as '$PM2_APP_NAME' on port $PORT"
  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save >/dev/null 2>&1 || true
else
  # Stop only the process this script started last time.
  if [ -f tmp/app.pid ]; then
    OLD_PID="$(cat tmp/app.pid 2>/dev/null || true)"
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo "Stopping previous instance (pid $OLD_PID)"
      kill "$OLD_PID" 2>/dev/null || true
      sleep 3
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
  fi
  # The pidfile only knows about instances THIS script started. An instance
  # started by the hosting panel, or by a deploy that ran before the pidfile
  # existed, is invisible to it - and that is exactly what broke production:
  # `npm run build` replaced .next/ and public/ underneath a live process that
  # was never restarted, so it kept serving its old HTML while the asset
  # hashes and image files that HTML referenced had been deleted from disk.
  # The symptom is a page that loads but is completely unstyled, with 500s on
  # /_next/static/css/<old-hash>.css.
  #
  # So reclaim the port directly, scoped by working directory: a process is
  # only killed when its cwd IS this deployment. A neighbouring app on the
  # same account has a different cwd and is left strictly alone, even if it
  # somehow sits on the same port.
  reclaim_port() {
    local port="$1" pid cwd want
    want="$(readlink -f "$DEPLOY_PATH" 2>/dev/null || echo "$DEPLOY_PATH")"
    for pid in $(ss -lptnH "sport = :$port" 2>/dev/null \
                 | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do
      [ -n "$pid" ] || continue
      cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
      if [ -n "$cwd" ] && [ "$cwd" = "$want" ]; then
        echo "Port $port held by a stale instance of this app (pid $pid) - stopping it"
        kill "$pid" 2>/dev/null || true
        sleep 3
        kill -9 "$pid" 2>/dev/null || true
      else
        echo "WARNING: port $port is held by pid $pid (cwd ${cwd:-unknown}), which is"
        echo "         NOT this deployment. Leaving it alone - it may be another app."
        echo "         If this domain is meant to be served from port $port, that"
        echo "         process is serving stale files and must be restarted by hand."
      fi
    done
  }
  reclaim_port "$PORT"

  echo "Starting app on port $PORT"
  nohup npm start > logs/app.log 2>&1 &
  echo $! > tmp/app.pid
  disown 2>/dev/null || true
fi

# Passenger/LiteSpeed app managers watch this file and respawn on touch.
touch tmp/restart.txt || true

# 7) Health probe.
sleep 8
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "http://127.0.0.1:$APP_PORT/" || true)
echo "App HTTP status on 127.0.0.1:$APP_PORT -> ${CODE:-000}"
case "$CODE" in
  2*|3*)
    echo "Deploy OK - app is serving on port $APP_PORT"
    ;;
  *)
    echo "App did not answer on port $APP_PORT (got ${CODE:-000}). Last log lines:"
    tail -40 logs/app.log 2>/dev/null || echo "(no logs/app.log)"
    echo "NOTE: the app may still need registering in the hosting panel so the"
    echo "      web server forwards this domain to port $APP_PORT."
    exit 1
    ;;
esac
