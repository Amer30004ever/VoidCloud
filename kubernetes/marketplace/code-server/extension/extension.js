const vscode = require('vscode');
const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');

class SemanticSearchProvider {
  constructor() {
    this.embeddings = new Map();
    this.chunks = [];
    this.indexing = false;
    this.debounceTimer = null;
    this.config = {
      ollamaUrl: vscode.workspace.getConfiguration('voidcloudSemanticSearch').get('ollamaUrl') || 'http://ollama-service.voidcloud.svc.cluster.local:11434',
      embeddingModel: vscode.workspace.getConfiguration('voidcloudSemanticSearch').get('embeddingModel') || 'nomic-embed-text',
      indexingDebounceMs: vscode.workspace.getConfiguration('voidcloudSemanticSearch').get('indexingDebounceMs') || 3000,
    };

    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(pulse) Indexing...';
    this.statusBarItem.tooltip = 'Semantic search indexing workspace';
    this.statusBarItem.hide();

    vscode.workspace.onDidChangeTextDocument((e) => this.scheduleIndexing(), this._disposables);
    vscode.workspace.onDidCreateFiles((e) => this.scheduleIndexing(), this._disposables);
    vscode.workspace.onDidDeleteFiles((e) => this.scheduleIndexing(), this._disposables);
    vscode.workspace.onDidRenameFiles((e) => this.scheduleIndexing(), this._disposables);

    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.uri.scheme === 'file') this.indexFile(doc.uri);
    });

    if (vscode.workspace.rootPath) {
      this.indexWorkspace();
    }
  }

  scheduleIndexing() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.indexWorkspace(), this.config.indexingDebounceMs);
  }

  async indexWorkspace() {
    if (this.indexing) return;
    this.indexing = true;
    this.statusBarItem.show();
    this.statusBarItem.text = '$(pulse) Indexing...';

    try {
      const files = await vscode.workspace.findFiles('**/*.{ts,js,py,go,rs,java,cpp,c,h,md,yaml,yml,json}', '**/node_modules/**', 500);
      this.chunks = [];
      this.embeddings.clear();

      for (const file of files) {
        try {
          const content = await vscode.workspace.fs.readFile(file);
          const text = Buffer.from(content).toString('utf8');
          const lines = text.split('\n');

          for (let i = 0; i < lines.length; i += 20) {
            const chunk = lines.slice(i, i + 20).join('\n');
            if (chunk.trim().length > 50) {
              const embedding = await this.getEmbedding(chunk);
              if (embedding) {
                const key = `${file.fsPath}:${i}`;
                this.embeddings.set(key, embedding);
                this.chunks.push({ key, text: chunk, file: file.fsPath, line: i + 1 });
              }
            }
          }
        } catch (e) {
          // skip unreadable files
        }
      }

      this.statusBarItem.text = `$(check) Indexed ${this.chunks.length} chunks`;
      this.statusBarItem.tooltip = `Semantic search: ${this.chunks.length} code chunks indexed`;
      setTimeout(() => this.statusBarItem.hide(), 5000);
    } catch (err) {
      this.statusBarItem.text = '$(error) Indexing failed';
      this.statusBarItem.tooltip = `Indexing error: ${err.message}`;
      setTimeout(() => this.statusBarItem.hide(), 5000);
    } finally {
      this.indexing = false;
    }
  }

  async indexFile(uri) {
    try {
      const content = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i += 20) {
        const chunk = lines.slice(i, i + 20).join('\n');
        if (chunk.trim().length > 50) {
          const embedding = await this.getEmbedding(chunk);
          if (embedding) {
            const key = `${uri.fsPath}:${i}`;
            this.embeddings.set(key, embedding);
            this.chunks.push({ key, text: chunk, file: uri.fsPath, line: i + 1 });
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  async getEmbedding(text) {
    return new Promise((resolve) => {
      const parsed = url.parse(this.config.ollamaUrl);
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: '/api/embeddings',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      };

      const req = (parsed.protocol === 'https:' ? https : http).request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.embedding || null);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.write(JSON.stringify({ model: this.config.embeddingModel, prompt: text.slice(0, 2000) }));
      req.end();
    });
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  async search(query) {
    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) return [];

    const results = this.chunks
      .map((chunk) => ({
        ...chunk,
        score: this.cosineSimilarity(queryEmbedding, this.embeddings.get(chunk.key) || []),
      }))
      .filter((r) => r.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return results;
  }

  dispose() {
    this._disposables.dispose();
    this.statusBarItem.dispose();
  }
}

const provider = new SemanticSearchProvider();

const disposable = vscode.commands.registerCommand('voidcloud.semanticSearch', async () => {
  const query = await vscode.window.showInputBox({
    prompt: 'Semantic code search',
    placeHolder: 'Search your codebase semantically...',
  });

  if (!query) return;

  const results = await provider.search(query);

  if (results.length === 0) {
    vscode.window.showInformationMessage('No semantic matches found');
    return;
  }

  const items = results.map((r) => ({
    label: path.basename(r.file),
    description: `Line ${r.line} · ${(r.score * 100).toFixed(0)}% match`,
    detail: r.text.slice(0, 200),
    file: r.file,
    line: r.line,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    matchOnDetail: true,
    matchOnDescription: true,
  });

  if (selected) {
    const uri = vscode.Uri.file(selected.file);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One });
    const range = new vscode.Range(selected.line - 1, 0, selected.line - 1, 0);
    editor.selection = new vscode.Selection(range.start, range.start);
    editor.revealRange(range);
  }
});

const _disposables = [disposable];

function activate() {
  vscode.window.showInformationMessage('VoidCloud Semantic Search activated');
}

function deactivate() {
  provider.dispose();
}

module.exports = { activate, deactivate };
