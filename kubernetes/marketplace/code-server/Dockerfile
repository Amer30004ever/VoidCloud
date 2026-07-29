FROM codercom/code-server:latest

USER root

# Install dependencies for building the extension
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy and install the semantic search extension
COPY extension/ /tmp/voidcloud-semantic-search/
RUN cd /tmp/voidcloud-semantic-search && \
    npm install --omit=dev 2>/dev/null || true && \
    code-server --install-extension /tmp/voidcloud-semantic-search && \
    rm -rf /tmp/voidcloud-semantic-search

# Configure Ollama endpoint for semantic search
ENV OLLAMA_HOST=http://ollama-service.voidcloud.svc.cluster.local:11434
ENV VOIDCLOUD_SEMANTIC_SEARCH_OLLAMA_URL=http://ollama-service.voidcloud.svc.cluster.local:11434
ENV VOIDCLOUD_SEMANTIC_SEARCH_EMBEDDING_MODEL=nomic-embed-text

USER coder

EXPOSE 8080
