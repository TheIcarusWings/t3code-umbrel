#!/bin/sh
set -eu

# /data is Umbrel's bind mount (${APP_DATA_DIR}/data). Everything that must
# survive updates lives here: t3 state, provider auth (~/.claude, ~/.codex,
# ...), and the repos themselves.
mkdir -p /data/home/projects

# Umbrel may create the bind-mount dirs as root or as uid 1000 depending on
# install path; t3 and the provider CLIs run as the unprivileged node user.
# Recursive chown only when the tree root is wrong (restarts with large repos
# must not pay a recursive chown every time), but always fix the dirs this
# script itself just created as root.
if [ "$(id -u)" = "0" ]; then
  if [ "$(stat -c '%u' /data/home)" != "1000" ]; then
    chown -R node:node /data
  fi
  chown node:node /data /data/home /data/home/projects
  exec setpriv --reuid node --regid node --init-groups \
    env HOME=/data/home T3CODE_HOME=/data/home/.t3 \
    t3 serve --host 0.0.0.0 --port "${T3CODE_PORT:-3773}" /data/home/projects
fi

exec t3 serve --host 0.0.0.0 --port "${T3CODE_PORT:-3773}" /data/home/projects
