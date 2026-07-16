import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DatabaseConnection,
  DatabaseManager,
  registerDatabaseDriver,
} from "../index.js";
import type { DatabaseDriver } from "../drivers/types.js";

// Register a fake driver so these tests can control ping latency and
// failure deterministically, without touching a real database.
let pingBehavior: () => Promise<void> = async () => {};

class FakeDriver implements DatabaseDriver {
  async connect(): Promise<void> {}
  getCapabilities() {
    return { rawQuery: false, structuredQuery: false };
  }
  async getTables(): Promise<string[]> {
    return [];
  }
  async getTableCount(): Promise<number> {
    return 0;
  }
  async getTableData(): Promise<Record<string, unknown>[]> {
    return [];
  }
  async getSchema() {
    return { dbType: "faketest", tables: [] };
  }
  async ping(): Promise<void> {
    return pingBehavior();
  }
}

registerDatabaseDriver({
  kind: "faketest",
  protocols: ["faketest:"],
  create: () => new FakeDriver(),
});

describe("connection health monitor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    pingBehavior = async () => {};
  });

  it("starts in an unknown state before any check has run", () => {
    const conn = new DatabaseConnection("t1", "faketest://host/db");
    expect(conn.getLastHealth()).toEqual({
      status: "unknown",
      latencyMs: null,
      lastCheckedAt: null,
      error: null,
    });
  });

  it("classifies a fast ping as healthy", async () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    pingBehavior = async () => {
      now += 50;
    };

    const conn = new DatabaseConnection("t2", "faketest://host/db");
    const health = await conn.checkHealth();

    expect(health.status).toBe("healthy");
    expect(health.latencyMs).toBe(50);
    expect(health.error).toBeNull();
    expect(health.lastCheckedAt).not.toBeNull();
  });

  it("classifies a 100-500ms ping as degraded", async () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    pingBehavior = async () => {
      now += 300;
    };

    const conn = new DatabaseConnection("t3", "faketest://host/db");
    const health = await conn.checkHealth();

    expect(health.status).toBe("degraded");
    expect(health.latencyMs).toBe(300);
  });

  it("classifies a ping over 500ms as slow", async () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    pingBehavior = async () => {
      now += 900;
    };

    const conn = new DatabaseConnection("t4", "faketest://host/db");
    const health = await conn.checkHealth();

    expect(health.status).toBe("slow");
    expect(health.latencyMs).toBe(900);
  });

  it("marks the connection unreachable and records the error on failure", async () => {
    pingBehavior = async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    };

    const conn = new DatabaseConnection("t5", "faketest://host/db");
    const health = await conn.checkHealth();

    expect(health.status).toBe("unreachable");
    expect(health.latencyMs).toBeNull();
    expect(health.error).toBe("connect ECONNREFUSED 127.0.0.1:5432");
  });

  it("checkAllHealth checks every connection without throwing when one fails", async () => {
    let callCount = 0;
    pingBehavior = async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error("boom");
      }
    };

    const manager = new DatabaseManager();
    manager.addConnection("a", "faketest://host/a");
    manager.addConnection("b", "faketest://host/b");

    await expect(manager.checkAllHealth()).resolves.toBeUndefined();

    const statuses = manager
      .listConnections()
      .map((c) => c.getLastHealth().status);
    expect(statuses).toContain("unreachable");
    expect(statuses).toContain("healthy");
  });

  it("startHealthMonitor polls on the configured interval and stopHealthMonitor cancels it", async () => {
    vi.useFakeTimers();
    let pingCount = 0;
    pingBehavior = async () => {
      pingCount += 1;
    };

    const manager = new DatabaseManager();
    manager.addConnection("a", "faketest://host/a");

    manager.startHealthMonitor(1000);

    await vi.advanceTimersByTimeAsync(1000);
    expect(pingCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(pingCount).toBe(2);

    manager.stopHealthMonitor();
    await vi.advanceTimersByTimeAsync(5000);
    expect(pingCount).toBe(2);

    vi.useRealTimers();
  });
});
