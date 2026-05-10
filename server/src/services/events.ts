import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserRole } from "./users.js";

export type SecurityEventPublic = {
  id: string;
  timestamp: string;
  severity: string;
  title: string;
  description: string;
  assetHostname: string;
  assetIp: string;
  sourceIp: string;
  tags: string[];
};

type SecurityEventStored = SecurityEventPublic & { userId: string };

function defaultEventsPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // server/src/services → repo root data/mock_events.json
  return join(here, "..", "..", "..", "data", "mock_events.json");
}

export function resolveEventsJsonPath(): string {
  const raw = process.env.EVENTS_JSON_PATH?.trim();
  if (!raw || raw.length === 0) {
    return defaultEventsPath();
  }
  return isAbsolute(raw) ? raw : join(process.cwd(), raw);
}

let cached: { path: string; events: SecurityEventStored[] } | null = null;

async function loadStoredEvents(): Promise<SecurityEventStored[]> {
  const path = resolveEventsJsonPath();
  if (cached?.path === path) {
    return cached.events;
  }
  const text = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Events file must contain a JSON array");
  }
  const events: SecurityEventStored[] = [];
  for (const item of parsed) {
    if (
      item &&
      typeof item === "object" &&
      "id" in item &&
      "userId" in item &&
      typeof (item as { id: unknown }).id === "string" &&
      typeof (item as { userId: unknown }).userId === "string"
    ) {
      events.push(item as SecurityEventStored);
    }
  }
  cached = { path, events };
  return events;
}

/** Clears in-memory cache (e.g. after tests); optional for production file-backed reload on next request. */
export function clearEventsCache(): void {
  cached = null;
}

function stripUserId(e: SecurityEventStored): SecurityEventPublic {
  const { userId: _u, ...rest } = e;
  return rest;
}

export async function listEventsForUser(userId: string, role: UserRole): Promise<SecurityEventPublic[]> {
  const all = await loadStoredEvents();
  const filtered =
    role === "admin" ? all : all.filter((e) => e.userId === userId);
  return filtered.map(stripUserId);
}

export async function getEventForUser(
  eventId: string,
  userId: string,
  role: UserRole,
): Promise<SecurityEventPublic | null> {
  const all = await loadStoredEvents();
  const found = all.find((e) => e.id === eventId);
  if (!found) {
    return null;
  }
  if (role !== "admin" && found.userId !== userId) {
    return null;
  }
  return stripUserId(found);
}
