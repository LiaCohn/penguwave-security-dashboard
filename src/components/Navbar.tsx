import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/events" style={{ textDecoration: "none", color: "inherit" }}>
          PenguWave 🐧
        </Link>
      </div>
      <div className="navbar-links">
        <Link
          to="/events"
          className={location.pathname.startsWith("/events") ? "active" : ""}
        >
          Events
        </Link>
        {isAdmin && (
          <Link to="/users" className={location.pathname === "/users" ? "active" : ""}>
            Users
          </Link>
        )}
        <span style={{ fontSize: 12, color: "#666", maxWidth: 180 }} title={user?.email}>
          {user?.email}
        </span>
        <button
          type="button"
          className="navbar-login-btn"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
