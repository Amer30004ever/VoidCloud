FROM codercom/code-server:latest

USER root

# The semantic-search extension is plain JS with no runtime dependencies, so it
# is installed by copying it straight into the code-server extensions directory.
# `--install-extension` only accepts a .vsix, and building one would require
# pulling vsce (and a full npm toolchain) into the image for no benefit.
ARG EXT_ID=voidcloud.voidcloud-semantic-search-1.0.0
ARG EXT_DIR=/usr/lib/code-server-extensions

COPY extension/ ${EXT_DIR}/${EXT_ID}/

# Fail the build early if the extension manifest or entrypoint is missing.
RUN test -f ${EXT_DIR}/${EXT_ID}/package.json \
    && test -f ${EXT_DIR}/${EXT_ID}/extension.js \
    && node -e "require('${EXT_DIR}/${EXT_ID}/package.json')" \
    && node --check ${EXT_DIR}/${EXT_ID}/extension.js \
    && chown -R coder:coder ${EXT_DIR}

# Seed the per-user extensions dir on first start (the home dir is often a
# mounted volume, so this cannot be baked in at build time alone).
COPY --chmod=755 <<'EOF' /usr/local/bin/voidcloud-entrypoint.sh
#!/bin/sh
set -e
TARGET="${HOME}/.local/share/code-server/extensions"
mkdir -p "$TARGET"
for ext in /usr/lib/code-server-extensions/*; do
  [ -d "$ext" ] || continue
  name="$(basename "$ext")"
  [ -d "$TARGET/$name" ] || cp -r "$ext" "$TARGET/$name"
done
exec /usr/bin/entrypoint.sh "$@"
EOF

# Default Ollama wiring; overridable via the Deployment env / workspace settings.
ENV OLLAMA_HOST=http://ollama-service.voidcloud.svc.cluster.local:11434 \
    VOIDCLOUD_SEMANTIC_SEARCH_OLLAMA_URL=http://ollama-service.voidcloud.svc.cluster.local:11434 \
    VOIDCLOUD_SEMANTIC_SEARCH_EMBEDDING_MODEL=nomic-embed-text

USER coder

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/voidcloud-entrypoint.sh"]
CMD ["--bind-addr", "0.0.0.0:8080", "."]
