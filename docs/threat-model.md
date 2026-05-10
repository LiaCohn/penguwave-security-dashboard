# Threat Thinking (Task 1)

This system handles authentication, user administration, and security event data viewed by analysts. The primary assets to protect are user accounts, admin privileges, and event data confidentiality.

The first likely attack path is account compromise through weak authentication handling. Attackers may attempt credential stuffing, brute-force login attempts, or session theft. To reduce this risk, the system uses bcrypt-hashed passwords, login rate limiting, and signed JWT-based sessions stored in HttpOnly cookies. Storing session tokens in HttpOnly cookies (instead of JavaScript-readable storage) limits token theft if browser-side script injection occurs.

A second major risk is privilege escalation and unauthorized data access. Because the application has an admin-only user management area and user-scoped events, attackers may try to call APIs directly (without using UI restrictions), replay old tokens, or access other users' data by ID manipulation. Mitigations include server-side authorization checks on every protected endpoint, active/disabled status enforcement, role checks for `/api/users`, and per-user filtering in `/api/events`. For sensitive authorization decisions, role and status are re-validated from the database rather than relying only on JWT claims.

A third risk is injection and client-side attacks, especially XSS and SQL injection. Event data may contain untrusted text, so rendering must avoid `innerHTML` unless content is sanitized. SQL injection is mitigated with parameterized queries throughout the backend. Input payloads are validated using schema-based validation (`zod`) before processing.

Operationally, misconfiguration is also a threat: missing secure headers, permissive CORS, weak secrets, and overexposed databases can all undermine application controls. The backend uses secure HTTP headers and an explicit CORS allowlist. In production, secrets should be stored in a secrets manager, HTTPS should be enforced end-to-end, cookies should always be Secure, and database access should remain private with least privilege.

Overall, the security focus is to protect identity and authorization boundaries first, then reduce exploitability of common web attack vectors, and finally harden runtime/deployment posture so controls remain effective outside local development.
