import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearEventsCache, getEventForUser, listEventsForUser } from "../services/events.js";

const sampleEvents = [
  {
    id: "evt-1",
    userId: "usr-a",
    timestamp: "2026-01-01T10:00:00.000Z",
    severity: "high",
    title: "Suspicious login",
    description: "Unusual login pattern detected",
    assetHostname: "host-a",
    assetIp: "10.0.0.10",
    sourceIp: "203.0.113.10",
    tags: ["auth"],
  },
  {
    id: "evt-2",
    userId: "usr-b",
    timestamp: "2026-01-01T11:00:00.000Z",
    severity: "medium",
    title: "Port scan",
    description: "Inbound scan detected",
    assetHostname: "host-b",
    assetIp: "10.0.0.11",
    sourceIp: "203.0.113.11",
    tags: ["network"],
  },
] as const;

let tempDir = "";
let eventsPath = "";
const originalEventsPath = process.env.EVENTS_JSON_PATH;

describe("events service authorization and filtering", () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "penguwave-events-test-"));
    eventsPath = join(tempDir, "events.json");
    await writeFile(eventsPath, JSON.stringify(sampleEvents), "utf8");
    process.env.EVENTS_JSON_PATH = eventsPath;
    clearEventsCache();
  });

  afterEach(() => {
    clearEventsCache();
  });

  afterAll(async () => {
    if (originalEventsPath === undefined) {
      delete process.env.EVENTS_JSON_PATH;
    } else {
      process.env.EVENTS_JSON_PATH = originalEventsPath;
    }
    clearEventsCache();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("returns all events to admin without userId leakage", async () => {
    const events = await listEventsForUser("usr-a", "admin");
    expect(events).toHaveLength(2);
    expect(events[0]).not.toHaveProperty("userId");
    expect(events[1]).not.toHaveProperty("userId");
  });

  it("returns only own events to non-admin users", async () => {
    const analystEvents = await listEventsForUser("usr-a", "analyst");
    const viewerEvents = await listEventsForUser("usr-b", "viewer");

    expect(analystEvents).toHaveLength(1);
    expect(analystEvents[0]?.id).toBe("evt-1");
    expect(viewerEvents).toHaveLength(1);
    expect(viewerEvents[0]?.id).toBe("evt-2");
  });

  it("does not allow non-admin access to another user's event", async () => {
    const event = await getEventForUser("evt-2", "usr-a", "analyst");
    expect(event).toBeNull();
  });

  it("allows admin access to any specific event", async () => {
    const event = await getEventForUser("evt-2", "usr-a", "admin");
    expect(event?.id).toBe("evt-2");
    expect(event).not.toHaveProperty("userId");
  });

  it("returns null for missing event id", async () => {
    const event = await getEventForUser("evt-does-not-exist", "usr-a", "admin");
    expect(event).toBeNull();
  });
});
