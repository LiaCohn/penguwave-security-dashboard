import type { User } from "./types";

const envBase =
  typeof import.meta.env.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL.trim() : "";
const API_ORIGIN = envBase.endsWith("/") ? envBase.slice(0, -1) : envBase;

/** Empty base → same-origin `/api/*` (Vite dev proxy or nginx in Docker) */
function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${p}`;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
    return (data as { error: string }).error;
  }
  return fallback;
}

export async function login(email: string, password: string) {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Invalid email or password"));
  }
  if (
    !data ||
    typeof data !== "object" ||
    !("token" in data) ||
    typeof (data as { token: unknown }).token !== "string"
  ) {
    throw new Error("Invalid response from server");
  }
  localStorage.setItem("token", (data as { token: string }).token);
  return data as { token: string; user: { id: string; email: string; role: string } };
}

export async function getAuthMe(): Promise<User | null> {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const res = await fetch(apiUrl("/api/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readJson(res);
  if (res.status === 401) {
    localStorage.removeItem("token");
    return null;
  }
  if (!res.ok) {
    localStorage.removeItem("token");
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const u = data as User;
  if (
    typeof u.id !== "string" ||
    typeof u.email !== "string" ||
    typeof u.role !== "string" ||
    typeof u.status !== "string"
  ) {
    return null;
  }
  return u;
}

export async function postLogout(): Promise<void> {
  const token = localStorage.getItem("token");
  try {
    await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    /* ignore network errors on logout */
  }
  localStorage.removeItem("token");
}

export async function getEvents() {
  const token = localStorage.getItem("token");
  const res = await fetch(apiUrl("/api/events"), {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  const data = await readJson(res);
  if (res.status === 401) {
    localStorage.removeItem("token");
    throw new Error("Authentication required");
  }
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to load events"));
  }
  return data;
}

export async function getUsers() {
  const token = localStorage.getItem("token");
  const res = await fetch(apiUrl("/api/users"), {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  const data = await readJson(res);
  if (res.status === 401) {
    localStorage.removeItem("token");
    throw new Error("Authentication required");
  }
  if (res.status === 403) {
    throw new Error(getErrorMessage(data, "Forbidden"));
  }
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Failed to load users"));
  }
  return data;
}

export async function createUser(user: { email: string; password: string; role: string }) {
  const token = localStorage.getItem("token");
  const res = await fetch(apiUrl("/api/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
    body: JSON.stringify(user),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not create user"));
  }
  return data;
}

export async function deleteUser(id: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(apiUrl(`/api/users/${id}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(data, "Could not delete user"));
  }
  return data;
}
