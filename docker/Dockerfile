# T3 Code server for Umbrel - runs `t3 serve` headless with provider CLIs on PATH.
FROM node:24-bookworm-slim AS base

ARG T3_VERSION=0.0.28
ARG CLAUDE_CODE_VERSION=2.1.205
ARG CODEX_VERSION=0.143.0
ARG OPENCODE_VERSION=1.17.17

# git for repos, build tools for node-pty's native build, ripgrep/curl/ssh for
# day-to-day agent work inside the environment.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    ca-certificates \
    curl \
    ripgrep \
    python3 \
    make \
    g++ \
    procps \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g \
    t3@${T3_VERSION} \
    @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
    @openai/codex@${CODEX_VERSION} \
    opencode-ai@${OPENCODE_VERSION} \
    && npm cache clean --force

# Drop the toolchain once node-pty is built to keep the image lean, but keep
# python3/make/g++? node-pty may rebuild on t3 updates inside the container is
# not a thing (image is immutable) - safe to remove.
RUN apt-get purge -y python3 make g++ 2>/dev/null; apt-get autoremove -y 2>/dev/null; rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# All mutable state (t3 base dir, provider auth, repos) lives under /data,
# which Umbrel bind-mounts from ${APP_DATA_DIR}/data.
ENV HOME=/data/home \
    T3CODE_HOME=/data/home/.t3 \
    T3CODE_NO_BROWSER=1

EXPOSE 3773

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
