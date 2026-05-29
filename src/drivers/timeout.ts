const DB_TIMEOUT_MS = 30_000;

export { DB_TIMEOUT_MS };

export function withTimeout<T>(promise: Promise<T>, ms: number = DB_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Connection timed out after ${ms / 1000}s. The database server may be unreachable or overloaded. Check your connection details and try again.`,
            ),
          ),
        ms,
      ),
    ),
  ]);
}
