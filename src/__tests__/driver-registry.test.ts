import { describe, expect, it } from "vitest";
import { DatabaseConnection, listSupportedProtocols } from "../index.js";

describe("driver registry", () => {
  it("registers CockroachDB protocols", () => {
    expect(listSupportedProtocols()).toEqual(
      expect.arrayContaining(["cockroach:", "cockroachdb:"]),
    );
  });

  it.each([
    ["cockroachdb://root@localhost:26257/defaultdb"],
    ["cockroach://root@localhost:26257/defaultdb"],
  ])("creates a CockroachDB connection for %s", (databaseUrl) => {
    const connection = new DatabaseConnection("cockroach", databaseUrl);

    expect(connection.getKind()).toBe("cockroachdb");
    expect(connection.getCapabilities()).toEqual({
      rawQuery: true,
      structuredQuery: false,
    });
  });
});
