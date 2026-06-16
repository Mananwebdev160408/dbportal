export const isReadOnlySqlQuery = (query: string): boolean => {
  const normalized = query
    .replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim()
    .toLowerCase();

  // Stored procedure calls can hide writes or privileged operations.
  const forbidden =
    /\b(insert|update|delete|drop|truncate|alter|create|replace|merge|grant|revoke|commit|rollback|savepoint|attach|detach|exec|execute|call)\b/;
  if (forbidden.test(normalized)) {
    return false;
  }

  // Read-only entry points we allow in this app.
  return /^(select|with|show|describe|desc|explain|pragma)\b/.test(normalized);
};
