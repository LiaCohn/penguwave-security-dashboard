import { useCallback, useEffect, useState } from "react";
import { createUser, deleteUser, getUsers } from "../api";
import type { User } from "../types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getUsers();
      if (!Array.isArray(data)) {
        setLoadError("Unexpected response from server");
        return;
      }
      setUsers(data as User[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await createUser({ email: newEmail, password: newPassword, role: newRole });
      setNewEmail("");
      setNewPassword("");
      setNewRole("analyst");
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!window.confirm(`Delete user ${email}?`)) return;
    setFormError(null);
    try {
      await deleteUser(id);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not delete user");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>User Management</h1>
        <p style={{ color: "#666" }}>Loading users…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <h1>User Management</h1>
        <p style={{ color: "#c00" }} role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>User Management</h1>
        <button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {formError && (
        <p style={{ color: "#c00", marginBottom: 12 }} role="alert">
          {formError}
        </p>
      )}

      {showForm && (
        <div
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 20,
            background: "#fafafa",
          }}
        >
          <h3 style={{ marginBottom: 12 }}>New User</h3>
          <form onSubmit={handleAddUser}>
            <div style={{ marginBottom: 8 }}>
              <label>Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@penguwave.io"
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create User"}
            </button>
          </form>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <span style={{ color: user.status === "active" ? "green" : "#999" }}>
                  {user.status}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => void handleDelete(user.id, user.email)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    padding: 0,
                    font: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && <p style={{ color: "#999" }}>No users.</p>}
    </div>
  );
}
