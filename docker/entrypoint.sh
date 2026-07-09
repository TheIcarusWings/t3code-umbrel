#!/bin/sh
set -eu

# /data is Umbrel's bind mount (${APP_DATA_DIR}/data). Everything that must
# survive updates lives here: t3 state, provider auth (~/.claude, ~/.codex,
# ...), and the repos themselves.
mkdir -p /data/home/projects

# Umbrel creates the bind-mount dirs as root; t3 and the provider CLIs run as
# the unprivileged node user. Only chown when ownership is wrong so restarts
# with large repos don't pay a recursive chown every time.
if [ "$(id -u)" = "0" ]; then
  owner="$(stat -c '%u' /data/home)"
  if [ "$owner" != "1000" ]; then
    chown -R node:node /data
  fi
  exec setpriv --reuid node --regid node --init-groups \
    env HOME=/data/home T3CODE_HOME=/data/home/.t3 \
    t3 serve --host 0.0.0.0 --port "${T3CODE_PORT:-3773}" /data/home/projects
fi

exec t3 serve --host 0.0.0.0 --port "${T3CODE_PORT:-3773}" /data/home/projects
