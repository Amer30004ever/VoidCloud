export function withCorrelationId<T extends Record<string, unknown>>(correlationId: string, message: T): T & { headers?: Record<string, string> } {
  if (!correlationId) return message;
  return {
    ...message,
    headers: {
      ...(message.headers as Record<string, string> | undefined),
      'x-request-id': correlationId,
      'x-correlation-id': correlationId,
    },
  };
}

export function extractCorrelationIdFromHeaders(headers: Record<string, unknown> | undefined): string | undefined {
  if (!headers) return undefined;
  return (headers['x-request-id'] ?? headers['x-correlation-id']) as string | undefined;
}
