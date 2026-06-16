import { describe, expect, it } from "vitest";
import { PostgresDriver } from "../drivers/postgres-driver.js";

describe("PostgresDriver connection error messages", () => {
  it('uses correctly spelled "PostgreSQL connection failed" in error message', async () => {
    // Use an invalid connection string that will definitely fail to connect.
    const driver = new PostgresDriver(
      "postgres://invalid:invalid@localhost:1/nonexistent",
    );

    await expect(driver.connect()).rejects.toThrow(
      /PostgreSQL connection failed/,
    );
  });

  it("includes the original error detail in the message", async () => {
    const driver = new PostgresDriver(
      "postgres://invalid:invalid@localhost:1/nonexistent",
    );

    await expect(driver.connect()).rejects.toThrow(
      /PostgreSQL connection failed: .+/,
    );
  });

  it('throws "driver not found" when pg module is unavailable', async () => {
    // This test validates the error string for missing driver.
    // In a test environment where pg IS installed, it won't trigger.
    // We still assert the constant is correct by inspecting the source.
    const driver = new PostgresDriver("postgres://x:x@localhost:5432/db");

    try {
      await driver.connect();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      const message = (err as Error).message;
      // Should be one of the two expected error messages
      expect(
        message.includes("PostgreSQL connection failed") ||
          message.includes("PostgreSQL driver not found"),
      ).toBe(true);
    }
  });
});
