import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIE_NAME, signAccessToken } from "../middleware/auth.js";
import type { UserWithSecret } from "../services/users.js";

const usersServiceMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserPublicById: vi.fn(),
  findUserRoleStatusById: vi.fn(),
  listUsersPublic: vi.fn(),
}));

const eventsServiceMock = vi.hoisted(() => ({
  listEventsForUser: vi.fn(),
  getEventForUser: vi.fn(),
}));

const bcryptMock = vi.hoisted(() => ({
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("../services/users.js", () => usersServiceMock);
vi.mock("../services/events.js", () => eventsServiceMock);
vi.mock("bcryptjs", () => bcryptMock);

import { app } from "../app.js";

describe("API auth and authorization", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in successfully and sets auth cookie", async () => {
    const user: UserWithSecret = {
      id: "usr-admin",
      email: "admin@example.com",
      password_hash: "hash",
      role: "admin",
      status: "active",
    };
    usersServiceMock.findUserByEmail.mockResolvedValue(user);
    bcryptMock.compare.mockResolvedValue(true);
    bcryptMock.default.compare.mockResolvedValue(true);

    const res = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: "usr-admin",
      email: "admin@example.com",
      role: "admin",
    });
    const setCookieHeader = res.headers["set-cookie"];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
    expect(cookies.some((cookie: string) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))).toBe(true);
  });

  it("rejects login with invalid credentials", async () => {
    const user: UserWithSecret = {
      id: "usr-admin",
      email: "admin@example.com",
      password_hash: "hash",
      role: "admin",
      status: "active",
    };
    usersServiceMock.findUserByEmail.mockResolvedValue(user);
    bcryptMock.compare.mockResolvedValue(false);
    bcryptMock.default.compare.mockResolvedValue(false);

    const res = await request(app).post("/api/auth/login").send({
      email: "admin@example.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password" });
  });

  it("returns current user for a valid auth cookie", async () => {
    usersServiceMock.findUserPublicById.mockResolvedValue({
      id: "usr-analyst",
      email: "analyst@example.com",
      role: "analyst",
      status: "active",
    });
    const token = signAccessToken({ sub: "usr-analyst", role: "analyst" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "usr-analyst",
      email: "analyst@example.com",
      role: "analyst",
      status: "active",
    });
  });

  it("requires authentication for events endpoint", async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  it("forbids non-admin user from users endpoint", async () => {
    usersServiceMock.findUserRoleStatusById.mockResolvedValue({
      role: "viewer",
      status: "active",
    });
    const token = signAccessToken({ sub: "usr-viewer", role: "viewer" });

    const res = await request(app)
      .get("/api/users")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden" });
  });

  it("allows admin user to list users", async () => {
    usersServiceMock.findUserRoleStatusById.mockResolvedValue({
      role: "admin",
      status: "active",
    });
    usersServiceMock.listUsersPublic.mockResolvedValue([
      {
        id: "usr-admin",
        email: "admin@example.com",
        role: "admin",
        status: "active",
      },
    ]);
    const token = signAccessToken({ sub: "usr-admin", role: "admin" });

    const res = await request(app)
      .get("/api/users")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: "usr-admin",
        email: "admin@example.com",
        role: "admin",
        status: "active",
      },
    ]);
  });

  it("allows active user to list events with scoped identity", async () => {
    usersServiceMock.findUserRoleStatusById.mockResolvedValue({
      role: "analyst",
      status: "active",
    });
    eventsServiceMock.listEventsForUser.mockResolvedValue([
      {
        id: "evt-1",
        timestamp: "2026-01-01T10:00:00.000Z",
        severity: "high",
        title: "Suspicious login",
        description: "Unusual login pattern detected",
        assetHostname: "host-a",
        assetIp: "10.0.0.10",
        sourceIp: "203.0.113.10",
        tags: ["auth"],
      },
    ]);
    const token = signAccessToken({ sub: "usr-analyst", role: "viewer" });

    const res = await request(app)
      .get("/api/events")
      .set("Cookie", [`${AUTH_COOKIE_NAME}=${token}`]);

    expect(res.status).toBe(200);
    expect(eventsServiceMock.listEventsForUser).toHaveBeenCalledWith("usr-analyst", "analyst");
    expect(res.body).toHaveLength(1);
  });
});
