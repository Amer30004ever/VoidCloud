/**
 * Tier 6.2 — distributed tracing coverage.
 *
 * Verifies the OTLP endpoint resolution and that initTracing is idempotent
 * (a second call must not construct/start a second NodeSDK).
 */

const startMock = jest.fn();
const sdkCtor = jest.fn();
const exporterCtor = jest.fn();

jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: class {
    constructor(cfg: any) {
      sdkCtor(cfg);
    }
    start = startMock;
  },
}));

jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class {
    constructor(cfg: any) {
      exporterCtor(cfg);
    }
  },
}));

jest.mock('@opentelemetry/resources', () => ({
  Resource: class {
    constructor(public attrs: any) {}
  },
}));

jest.mock('@opentelemetry/semantic-conventions', () => ({
  SemanticResourceAttributes: {
    SERVICE_NAME: 'service.name',
    SERVICE_VERSION: 'service.version',
  },
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: jest.fn(() => []),
}));

jest.mock('@sentry/opentelemetry', () => ({
  SentrySpanProcessor: class {},
}));

describe('Tier 6.2 — initTracing', () => {
  beforeEach(() => {
    jest.resetModules();
    startMock.mockClear();
    sdkCtor.mockClear();
    exporterCtor.mockClear();
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  });

  it('starts the SDK with the default Jaeger OTLP endpoint', () => {
    const { initTracing } = require('../../../services/shared/tracing/tracing');
    initTracing('vps');

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(exporterCtor).toHaveBeenCalledWith({
      url: 'http://jaeger:4318/v1/traces',
    });
  });

  it('honours OTEL_EXPORTER_OTLP_ENDPOINT when set', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://otel-collector:4318/v1/traces';
    const { initTracing } = require('../../../services/shared/tracing/tracing');
    initTracing('billing');

    expect(exporterCtor).toHaveBeenCalledWith({
      url: 'http://otel-collector:4318/v1/traces',
    });
  });

  it('tags the resource with the service name', () => {
    const { initTracing } = require('../../../services/shared/tracing/tracing');
    initTracing('crm');

    const cfg = sdkCtor.mock.calls[0][0];
    expect(cfg.resource.attrs['service.name']).toBe('crm');
    expect(cfg.resource.attrs['service.version']).toBeDefined();
  });

  it('is idempotent — a second call does not start a second SDK', () => {
    const { initTracing } = require('../../../services/shared/tracing/tracing');
    initTracing('auth');
    initTracing('auth');

    expect(sdkCtor).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledTimes(1);
  });
});
