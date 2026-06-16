import { describe, expect, it } from "vitest";
import { isReadOnlySqlQuery } from "../query-safety";

describe("isReadOnlySqlQuery", () => {
  it("allows read-only SQL statements", () => {
    expect(isReadOnlySqlQuery("SELECT * FROM users")).toBe(true);
    expect(
      isReadOnlySqlQuery(
        "WITH recent AS (SELECT * FROM users) SELECT * FROM recent",
      ),
    ).toBe(true);
    expect(isReadOnlySqlQuery("SHOW TABLES")).toBe(true);
  });

  it("blocks explicit writes hidden behind allowed entry points", () => {
    expect(
      isReadOnlySqlQuery(
        "WITH deleted AS (DELETE FROM users RETURNING *) SELECT * FROM deleted",
      ),
    ).toBe(false);
    expect(isReadOnlySqlQuery("EXPLAIN UPDATE users SET name = 'A'")).toBe(
      false,
    );
  });

  it("explicitly blocks stored procedure calls", () => {
    expect(isReadOnlySqlQuery("EXEC sp_who")).toBe(false);
    expect(isReadOnlySqlQuery("EXECUTE xp_cmdshell 'dir'")).toBe(false);
    expect(isReadOnlySqlQuery("CALL read_procedure()")).toBe(false);
  });

  it("handles SQL comments correctly", () => {
    expect(isReadOnlySqlQuery("SELECT * FROM users /* inline comment */")).toBe(
      true,
    );
    expect(isReadOnlySqlQuery("SELECT * -- line comment\nFROM users")).toBe(
      true,
    );
    expect(isReadOnlySqlQuery("SELECT '/* not a comment */'")).toBe(true);
    expect(
      isReadOnlySqlQuery("SELECT * FROM users WHERE name = '-- not a comment'"),
    ).toBe(true);
    expect(
      isReadOnlySqlQuery(
        "SELECT * FROM users /* comment with forbidden word like DELETE */",
      ),
    ).toBe(true);
    expect(
      isReadOnlySqlQuery(
        "SELECT * FROM users -- comment with forbidden word like UPDATE",
      ),
    ).toBe(true);
  });
});
