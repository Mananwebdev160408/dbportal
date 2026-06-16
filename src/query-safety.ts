export const isReadOnlySqlQuery = (query: string): boolean => {
  // Safe linear-time comment stripping to prevent ReDoS (catastrophic backtracking)
  let normalized = "";
  let i = 0;
  const n = query.length;
  while (i < n) {
    if (query[i] === "/" && i + 1 < n && query[i + 1] === "*") {
      i += 2;
      while (
        i < n &&
        !(query[i] === "*" && i + 1 < n && query[i + 1] === "/")
      ) {
        i++;
      }
      i += 2;
    } else if (query[i] === "-" && i + 1 < n && query[i + 1] === "-") {
      i += 2;
      while (i < n && query[i] !== "\n" && query[i] !== "\r") {
        i++;
      }
    } else if (query[i] === "'" || query[i] === '"') {
      const quote = query[i];
      normalized += quote;
      i++;
      while (i < n && query[i] !== quote) {
        if (query[i] === "\\") {
          normalized += query[i];
          i++;
        }
        if (i < n) {
          normalized += query[i];
          i++;
        }
      }
      if (i < n) {
        normalized += quote;
        i++;
      }
    } else {
      normalized += query[i];
      i++;
    }
  }

  normalized = normalized.trim().toLowerCase();

  // Stored procedure calls can hide writes or privileged operations.
  const forbidden =
    /\b(insert|update|delete|drop|truncate|alter|create|replace|merge|grant|revoke|commit|rollback|savepoint|attach|detach|exec|execute|call)\b/;
  if (forbidden.test(normalized)) {
    return false;
  }

  // Read-only entry points we allow in this app.
  return /^(select|with|show|describe|desc|explain|pragma)\b/.test(normalized);
};
