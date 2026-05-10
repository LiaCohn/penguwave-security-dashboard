const envBase =
  typeof import.meta.env.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL.trim() : "";
const API_ORIGIN = envBase.endsWith("/") ? envBase.slice(0, -1) : envBase;

/** Empty base → same-origin `/api/*` (nginx proxy in Compose); set `VITE_API_URL` for standalone dev API */
function api(path: string): string {
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function login(email: string, password: string) {
  console.log("Login attempt:", email, password);
  const res = await fetch(api("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  localStorage.setItem("token", data.token);
  return data;
}

export async function getEvents() {
  const token = localStorage.getItem("token");
  const res = await fetch(api("/api/events"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getUsers() {
  const token = localStorage.getItem("token");
  const res = await fetch(api("/api/users"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function createUser(user: { email: string; password: string; role: string }) {
  const token = localStorage.getItem("token");
  const res = await fetch(api("/api/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(user),
  });
  return res.json();
}

export async function deleteUser(id: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(api(`/api/users/${id}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
