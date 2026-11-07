export function errorMessage(error: unknown, fallback = '服務暫時無法使用。'): string {
  return error instanceof Error ? error.message : fallback;
}
export function errorCode(error: unknown): string | number | undefined {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (typeof error.code === 'string' || typeof error.code === 'number')
  )
    return error.code;
  return undefined;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
