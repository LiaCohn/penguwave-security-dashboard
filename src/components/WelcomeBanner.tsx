import { useState } from "react";

export default function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem("welcome-dismissed") === "true";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("welcome-dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="welcome-banner">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>
            Welcome to PenguWave
          </h2>
          <p style={{ margin: "0 0 12px", color: "#555", fontSize: 13 }}>
            Security operations portal — sign in to view events scoped to your account. Admins can
            manage users via the API and the Users page.
          </p>

          <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Documentation</h3>
          <ul style={{ margin: "0 0 10px", paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: "#444" }}>
            <li>
              API shapes and status codes: <code>docs/api_contract.md</code>
            </li>
            <li>
              Run the stack: <code>README.md</code> (Docker Compose or local dev)
            </li>
          </ul>

          <p style={{ margin: "0", color: "#888", fontSize: 12, fontStyle: "italic" }}>
            Dismiss this card anytime — your choice is remembered for this browser session.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#999",
            padding: "0 0 0 12px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
