/**
 * Network Timeout Utilities
 * Wraps async operations with timeout to prevent infinite hangs on poor mobile networks
 */

export class NetworkTimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'NetworkTimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * Rejects if the promise doesn't resolve within the specified time
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 15000ms = 15s)
 * @param errorMessage - Custom error message for timeout
 * @returns Promise that rejects on timeout or resolves with the original promise result
 *
 * @example
 * const data = await withTimeout(
 *   supabase.from('users').select('*'),
 *   10000,
 *   'Failed to load users'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new NetworkTimeoutError(errorMessage || 'Request timeout'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Wraps a Supabase query with timeout and retry logic
 * Automatically handles common network errors on mobile
 *
 * @param queryFn - Function that returns a Supabase query promise
 * @param options - Configuration options
 * @returns Promise that resolves with query result or rejects with error
 *
 * @example
 * const { data, error } = await queryWithTimeout(
 *   () => supabase.from('rating_proof').select('*').eq('player_id', userId),
 *   { timeout: 10000, retries: 2 }
 * );
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { timeout = 15000, retries = 1, retryDelay = 1000, onRetry } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(queryFn(), timeout, `Query timeout after ${timeout}ms`);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === retries) {
        break;
      }

      // Don't retry on certain errors (auth, validation, etc.)
      if (isNonRetryableError(error)) {
        break;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError!;
}

/**
 * Checks if an error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  // Don't retry auth errors, validation errors, or not found errors
  return (
    message.includes('auth') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('validation') ||
    message.includes('not found') ||
    message.includes('invalid')
  );
}

/**
 * Checks if an error is a network timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof NetworkTimeoutError;
}

/**
 * Gets a user-friendly error message for network errors
 */
export function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof NetworkTimeoutError) {
    return 'Request took too long. Please check your internet connection and try again.';
  }

  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}
