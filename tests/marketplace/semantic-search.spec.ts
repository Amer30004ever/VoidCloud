/**
 * Tier 5.13b — semantic code indexing in code-server.
 * Exercises the real extension's embedding call, cosine math, and search
 * ranking/threshold with `vscode` and the HTTP layer stubbed.
 */
const nodeHttp = require('http');

jest.mock(
  'vscode',
  () => {
    const disposable = { dispose: jest.fn() };
    return {
      workspace: {
        getConfiguration: () => ({ get: () => undefined }),
        onDidChangeTextDocument: jest.fn(),
        onDidCreateFiles: jest.fn(),
        onDidDeleteFiles: jest.fn(),
        onDidRenameFiles: jest.fn(),
        onDidOpenTextDocument: jest.fn(),
        findFiles: jest.fn().mockResolvedValue([]),
        fs: { readFile: jest.fn() },
        rootPath: undefined,
      },
      window: {
        createStatusBarItem: () => ({
          text: '',
          tooltip: '',
          show: jest.fn(),
          hide: jest.fn(),
          dispose: jest.fn(),
        }),
        showQuickPick: jest.fn(),
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        showTextDocument: jest.fn(),
      },
      commands: { registerCommand: jest.fn(() => disposable) },
      StatusBarAlignment: { Right: 2 },
      Uri: { file: (p: string) => ({ fsPath: p, scheme: 'file' }) },
      Position: class {},
      Range: class {},
    };
  },
  { virtual: true },
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SemanticSearchProvider } = require('../../kubernetes/marketplace/code-server/extension/extension.js');

/** Fake an Ollama JSON response over the stubbed http.request. */
function stubOllama(payload: unknown, opts: { fail?: boolean } = {}) {
  return jest.spyOn(nodeHttp, 'request').mockImplementation(((_o: any, cb: any) => {
    const req: any = {
      on: (event: string, handler: (e: Error) => void) => {
        if (opts.fail && event === 'error') setImmediate(() => handler(new Error('boom')));
      },
      write: jest.fn(),
      end: jest.fn(),
    };
    if (!opts.fail) {
      const listeners: Record<string, (chunk?: unknown) => void> = {};
      const res = {
        on: (event: string, handler: (chunk?: unknown) => void) => {
          listeners[event] = handler;
        },
      };
      setImmediate(() => {
        cb(res);
        listeners.data?.(JSON.stringify(payload));
        listeners.end?.();
      });
    }
    return req;
  }) as never);
}

describe('SemanticSearchProvider — cosine similarity', () => {
  const provider = new SemanticSearchProvider();

  it('returns 1 for identical vectors', () => {
    expect(provider.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(provider.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('returns -1 for opposite vectors', () => {
    expect(provider.cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 6);
  });

  it('is scale invariant', () => {
    expect(provider.cosineSimilarity([1, 2], [10, 20])).toBeCloseTo(1, 6);
  });

  it('guards against nulls, empties, and length mismatch', () => {
    expect(provider.cosineSimilarity(null, [1])).toBe(0);
    expect(provider.cosineSimilarity([1], null)).toBe(0);
    expect(provider.cosineSimilarity([1, 2], [1])).toBe(0);
    expect(provider.cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe('SemanticSearchProvider — getEmbedding', () => {
  afterEach(() => jest.restoreAllMocks());

  it('posts to /api/embeddings and returns the embedding vector', async () => {
    const spy = stubOllama({ embedding: [0.1, 0.2, 0.3] });
    const provider = new SemanticSearchProvider();
    await expect(provider.getEmbedding('hello world')).resolves.toEqual([0.1, 0.2, 0.3]);
    const options = (spy.mock.calls[0] as any[])[0];
    expect(options.path).toBe('/api/embeddings');
    expect(options.method).toBe('POST');
  });

  it('resolves null when the response has no embedding', async () => {
    stubOllama({ error: 'model not found' });
    const provider = new SemanticSearchProvider();
    await expect(provider.getEmbedding('x')).resolves.toBeNull();
  });

  it('resolves null (never throws) when the request errors', async () => {
    stubOllama(null, { fail: true });
    const provider = new SemanticSearchProvider();
    await expect(provider.getEmbedding('x')).resolves.toBeNull();
  });
});

describe('SemanticSearchProvider — search ranking', () => {
  afterEach(() => jest.restoreAllMocks());

  const seed = (provider: any) => {
    provider.chunks = [
      { key: 'a', text: 'exact', file: '/a.ts', line: 1 },
      { key: 'b', text: 'near', file: '/b.ts', line: 2 },
      { key: 'c', text: 'unrelated', file: '/c.ts', line: 3 },
    ];
    provider.embeddings = new Map<string, number[]>([
      ['a', [1, 0]],
      ['b', [0.9, 0.44]],
      ['c', [0, 1]],
    ]);
  };

  it('ranks by similarity and drops anything at or below the 0.5 threshold', async () => {
    stubOllama({ embedding: [1, 0] });
    const provider = new SemanticSearchProvider();
    seed(provider);
    const results = await provider.search('query');
    expect(results.map((r: any) => r.key)).toEqual(['a', 'b']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results.every((r: any) => r.score > 0.5)).toBe(true);
  });

  it('returns an empty list when the query cannot be embedded', async () => {
    stubOllama({ error: 'down' });
    const provider = new SemanticSearchProvider();
    seed(provider);
    await expect(provider.search('query')).resolves.toEqual([]);
  });

  it('caps the result set at 20 hits', async () => {
    stubOllama({ embedding: [1, 0] });
    const provider = new SemanticSearchProvider();
    provider.chunks = Array.from({ length: 50 }, (_, i) => ({
      key: `k${i}`,
      text: `chunk ${i}`,
      file: `/f${i}.ts`,
      line: i + 1,
    }));
    provider.embeddings = new Map(provider.chunks.map((c: any) => [c.key, [1, 0]]));
    const results = await provider.search('query');
    expect(results).toHaveLength(20);
  });
});
