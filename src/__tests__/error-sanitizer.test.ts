import { afterEach, describe, expect, it } from "vitest";
import {
  _clearRegisteredSecretsForTests,
  registerConnectionStringForRedaction,
  sanitizeErrorMessage,
} from "../error-sanitizer.js";

describe("sanitizeErrorMessage", () => {
  afterEach(() => {
    _clearRegisteredSecretsForTests();
  });

  it("redacts credentials from a well-formed connection string appearing in an error", () => {
    const message =
      'connection failed for "postgres://dbuser:hunter2@localhost:5432/mydb": timeout';

    expect(sanitizeErrorMessage(message)).toBe(
      'connection failed for "postgres://***:***@localhost:5432/mydb": timeout',
    );
  });

  it("redacts ODBC-style password= pairs used by mssql connection strings", () => {
    const message =
      "login failed: Server=host;Password=SuperSecret1;User Id=sa";

    expect(sanitizeErrorMessage(message)).toBe(
      "login failed: Server=host;Password=***;User Id=sa",
    );
  });

  it("redacts partial credential fragments leaked when a malformed URL fails to parse", () => {
    // A password containing an unescaped "@" breaks standard URL parsing.
    // Node's URL parser (and the mongodb driver) can throw an error that
    // echoes only a fragment of the offending segment, not the full string.
    const connectionString = "mongodb://user:P@ss:word@localhost:27017/db";
    registerConnectionStringForRedaction(connectionString);

    const leakedMessage = "Unable to parse ss:word with URL";

    expect(sanitizeErrorMessage(leakedMessage)).not.toContain("ss:word");
    expect(sanitizeErrorMessage(leakedMessage)).toContain("***");
  });

  it("redacts the full password when it appears verbatim after registration", () => {
    const connectionString = "redis://:SuperSecretRedisPass@localhost:6379";
    registerConnectionStringForRedaction(connectionString);

    const message = "ECONNREFUSED using password SuperSecretRedisPass";

    expect(sanitizeErrorMessage(message)).not.toContain("SuperSecretRedisPass");
  });

  it("leaves ordinary error messages untouched", () => {
    const message =
      "PostgreSQL connection failed: connect ECONNREFUSED 127.0.0.1:5432";

    expect(sanitizeErrorMessage(message)).toBe(message);
  });

  it("ignores connection strings with no credentials segment", () => {
    expect(() =>
      registerConnectionStringForRedaction("sqlite://./data.db"),
    ).not.toThrow();

    const message = "sqlite: unable to open database file";
    expect(sanitizeErrorMessage(message)).toBe(message);
  });
});
