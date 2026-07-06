// Database drivers (mongodb, pg, mysql2, mssql, redis) sometimes echo the raw
// connection string, or a fragment of it, inside error messages — for
// example when a password contains an unescaped "@" or ":" and URL parsing
// fails partway through. Those messages are surfaced to console logs and to
// API clients via toMessage() in cli.ts, so they must be scrubbed before
// either happens, regardless of which driver or error path produced them.

const MIN_FRAGMENT_LENGTH = 4;

const knownSecretFragments = new Set<string>();

// Best-effort extraction of the "user:password" (or malformed equivalent)
// segment from a connection string. Works even when the string as a whole
// is not a valid URL, since drivers can still leak fragments of it.
const extractCredentialBlob = (connectionString: string): string | null => {
  const schemeMatch = connectionString.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);
  if (!schemeMatch) return null;

  const rest = connectionString.slice(schemeMatch[0].length);
  const pathIndex = rest.indexOf("/");
  const authority = pathIndex === -1 ? rest : rest.slice(0, pathIndex);
  const lastAt = authority.lastIndexOf("@");
  if (lastAt === -1) return null;

  const blob = authority.slice(0, lastAt);
  return blob.length > 0 ? blob : null;
};

/**
 * Registers a connection string so any credential fragments it contains are
 * redacted from future error messages, even if the string itself never
 * appears verbatim (e.g. only a truncated piece survives a parser error).
 */
export const registerConnectionStringForRedaction = (
  connectionString: string,
): void => {
  const blob = extractCredentialBlob(connectionString);
  if (!blob) return;

  knownSecretFragments.add(blob);

  const colonIndex = blob.indexOf(":");
  const password = colonIndex === -1 ? "" : blob.slice(colonIndex + 1);
  if (password.length >= MIN_FRAGMENT_LENGTH) {
    knownSecretFragments.add(password);
  }
};

// Covers well-formed connection strings that appear intact in error text.
const URI_CREDENTIALS_PATTERN = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^/\s@]+@/g;

// Covers ODBC/ADO-style "password=...;" or "pwd=...;" pairs (mssql).
const KEY_VALUE_PASSWORD_PATTERN = /\b(password|pwd)\s*=\s*[^;\s]+/gi;

const redactKnownFragments = (message: string): string => {
  let sanitized = message;

  for (const secret of knownSecretFragments) {
    // Sweep every substring of the registered secret, longest first, so
    // partial leaks (a parser dying mid-string) are caught too, not just
    // exact full-secret matches.
    for (let len = secret.length; len >= MIN_FRAGMENT_LENGTH; len--) {
      for (let start = 0; start <= secret.length - len; start++) {
        const fragment = secret.slice(start, start + len);
        if (sanitized.includes(fragment)) {
          sanitized = sanitized.split(fragment).join("***");
        }
      }
    }
  }

  return sanitized;
};

export const sanitizeErrorMessage = (message: string): string => {
  const withUriRedacted = message
    .replace(URI_CREDENTIALS_PATTERN, "$1***:***@")
    .replace(KEY_VALUE_PASSWORD_PATTERN, "$1=***");

  return redactKnownFragments(withUriRedacted);
};

/** Test-only helper to reset module state between test cases. */
export const _clearRegisteredSecretsForTests = (): void => {
  knownSecretFragments.clear();
};
