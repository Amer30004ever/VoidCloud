import { StructuredLogger } from '../../../services/shared/logging';

describe('StructuredLogger (Prompt 6.1)', () => {
  const originalEnv = process.env.LOG_FORMAT;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    process.env.LOG_FORMAT = 'json';
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env.LOG_FORMAT = originalEnv;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it('emits JSON with service, level, message, timestamp, and correlationId', () => {
    const logger = new StructuredLogger('vps');
    logger.log('VPS created', { correlationId: 'abc-123', userId: 'user-1' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.service).toBe('vps');
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('VPS created');
    expect(parsed.correlationId).toBe('abc-123');
    expect(parsed.userId).toBe('user-1');
    expect(parsed.timestamp).toBeDefined();
  });

  it('falls back to plain text when LOG_FORMAT is not json', () => {
    process.env.LOG_FORMAT = '';
    const logger = new StructuredLogger('auth');
    logger.warn('Token expiring', { correlationId: 'cid-1' });
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    const output = (console.warn as jest.Mock).mock.calls[0][0];
    expect(output).toContain('[auth]');
    expect(output).toContain('Token expiring');
  });

  it('includes error details when provided', () => {
    const logger = new StructuredLogger('billing');
    logger.error('Payment failed', { error: { message: 'card declined' } });
    const output = (console.error as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('error');
    expect(parsed.error.message).toBe('card declined');
  });
});
