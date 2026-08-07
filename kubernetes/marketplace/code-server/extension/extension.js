const vscode = require('vscode');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');

const DEFAULT_OLLAMA_URL = 'http://ollama-service.voidcloud.svc.cluster.local:11434';
const DEFAULT_MODEL = 'nomic-embed-text';
const SCORE_THRESHOLD = 0.5;
const MAX_RESULTS = 20;
const CHUNK_LINES = 20;

function conf(key, fallback) {
  try {
    const value = vscode.workspace.getConfiguration('voidcloudSemanticSearch').get(key);
    return value === undefined || value === null || value === '' ? fallback : value;
  } catch {
    return fallback;
  }
}

class SemanticSearchProvider {
  constructor() {
    this.embeddings = new Map();
    this.chunks = [];
    this.indexing = false;
    this.debounceTimer = null;
    this.disposables = [];
    this.config = {
      // Env vars are baked into the code-server image / injected by the
      // Deployment; workspace settings win when a user overrides them.
      ollamaUrl: conf(
        'ollamaUrl',
        process.env.VOIDCLOUD_SEMANTIC_SEARCH_OLLAMA_URL || process.env.OLLAMA_HOST || DEFAULT_OLLAMA_URL,
      ),
      embeddingModel: conf(
        'embeddingModel',
        process.env.VOIDCLOUD_SEMANTIC_SEARCH_EMBEDDING_MODEL || DEFAULT_MODEL,
      ),
      indexingDebounceMs: conf('indexingDebounceMs', 3000),
    };

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(search) Semantic';
    this.statusBarItem.tooltip = 'VoidCloud semantic code search';
    this.statusBarItem.command = 'voidcloud.semanticSearch';
    this.statusBarItem.hide();
  }

  /**
   * Attach workspace listeners and kick off the first index. Called from
   * `activate()` only, so unit tests can construct the provider without
   * triggering background work.
   */
  register() {
    const reindex = () => this.scheduleIndexing();
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(reindex),
      vscode.workspace.onDidCreateFiles(reindex),
      vscode.workspace.onDidDeleteFiles(reindex),
      vscode.workspace.onDidRenameFiles(reindex),
    );
    this.statusBarItem.show();
    void this.indexWorkspace();
  }

  scheduleIndexing() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.indexWorkspace(), this.config.indexingDebounceMs);
  }

  /** True when the Ollama endpoint answers and hosts the embedding model. */
  async checkOllama() {
    const tags = await this.request('/api/tags', null, 'GET');
    if (!tags) return { reachable: false, hasModel: false };
    const names = Array.isArray(tags.models) ? tags.models.map((m) => String(m.name || '')) : [];
    const base = String(this.config.embeddingModel).split(':')[0];
    return { reachable: true, hasModel: names.some((n) => n.split(':')[0] === base) };
  }

  async indexWorkspace() {
    if (this.indexing) return;
    this.indexing = true;
    this.statusBarItem.show();
    this.statusBarItem.text = '$(pulse) Indexing...';

    try {
      const health = await this.checkOllama();
      if (!health.reachable) {
        throw new Error(`Ollama unreachable at ${this.config.ollamaUrl}`);
      }
      if (!health.hasModel) {
        throw new Error(
          `Embedding model "${this.config.embeddingModel}" is not pulled on the Ollama server`,
        );
      }

      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx,py,go,rs,java,cpp,c,h,md,yaml,yml,json}',
        '**/{node_modules,.git,dist,build,.next}/**',
        500,
      );

      const chunks = [];
      const embeddings = new Map();

      for (const file of files) {
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const lines = Buffer.from(content).toString('utf8').split('\n');
          for (let i = 0; i < lines.length; i += CHUNK_LINES) {
            const chunk = lines.slice(i, i + CHUNK_LINES).join('\n');
            if (chunk.trim().length <= 50) continue;
            const embedding = await this.getEmbedding(chunk);
            if (!embedding) continue;
            const key = `${file.fsPath}:${i}`;
            embeddings.set(key, embedding);
            chunks.push({ key, text: chunk, file: file.fsPath, line: i + 1 });
          }
        } catch {
          // skip unreadable files
        }
      }

      // Swap atomically so searches never observe a half-built index.
      this.chunks = chunks;
      this.embeddings = embeddings;

      this.statusBarItem.text = `$(check) ${this.chunks.length} chunks`;
      this.statusBarItem.tooltip = `Semantic search: ${this.chunks.length} code chunks indexed`;
    } catch (err) {
      this.statusBarItem.text = '$(error) Index failed';
      this.statusBarItem.tooltip = `Semantic search: ${err.message}`;
    } finally {
      this.indexing = false;
    }
  }

  /** Low-level JSON call to the Ollama HTTP API. Never throws; null on failure. */
  request(pathname, body, method = 'POST') {
    return new Promise((resolve) => {
      let parsed;
      try {
        parsed = url.parse(this.config.ollamaUrl);
      } catch {
        return resolve(null);
      }
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: pathname,
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      };

      const req = (parsed.protocol === 'https:' ? https : http).request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      if (typeof req.on === 'function') req.on('timeout', () => resolve(null));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async getEmbedding(text) {
    const json = await this.request('/api/embeddings', {
      model: this.config.embeddingModel,
      prompt: String(text).slice(0, 2000),
    });
    return (json && json.embedding) || null;
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  async search(query) {
    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) return [];

    return this.chunks
      .map((chunk) => ({
        ...chunk,
        score: this.cosineSimilarity(queryEmbedding, this.embeddings.get(chunk.key) || []),
      }))
      .filter((r) => r.score > SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS);
  }

  dispose() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    for (const d of this.disposables) {
      try {
        d && typeof d.dispose === 'function' && d.dispose();
      } catch {
        // ignore
      }
    }
    this.disposables = [];
    this.statusBarItem.dispose();
  }
}

let provider = null;

function activate(context) {
  provider = new SemanticSearchProvider();
  provider.register();

  const searchCommand = vscode.commands.registerCommand('voidcloud.semanticSearch', async () => {
    const query = await vscode.window.showInputBox({
      prompt: 'Semantic code search',
      placeHolder: 'Describe what the code does...',
    });
    if (!query) return;

    const results = await provider.search(query);
    if (results.length === 0) {
      vscode.window.showInformationMessage('No semantic matches found');
      return;
    }

    const selected = await vscode.window.showQuickPick(
      results.map((r) => ({
        label: path.basename(r.file),
        description: `Line ${r.line} · ${(r.score * 100).toFixed(0)}% match`,
        detail: r.text.slice(0, 200),
        file: r.file,
        line: r.line,
      })),
      { matchOnDetail: true, matchOnDescription: true, placeHolder: `${results.length} matches` },
    );
    if (!selected) return;

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(selected.file));
    const editor = await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(selected.line - 1, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
  });

  const reindexCommand = vscode.commands.registerCommand('voidcloud.reindexWorkspace', () =>
    provider.indexWorkspace(),
  );

  if (context && Array.isArray(context.subscriptions)) {
    context.subscriptions.push(searchCommand, reindexCommand, provider);
  }
}

function deactivate() {
  if (provider) provider.dispose();
  provider = null;
}

module.exports = { activate, deactivate, SemanticSearchProvider };
