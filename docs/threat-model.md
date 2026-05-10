# Threat thinking (Part 2)

This app combines user management and security event data, so failures in authentication or authorization can expose sensitive analyst workflows and alert content.
Authentication

The login flow is an obvious target: credential stuffing and password guessing against known or weak passwords. Implementation mistakes could also enable authentication bypass (for example, unsafe handling of credentials or trust placed only in client-side checks). I plan to mitigate this with rate limiting (and generic errors where appropriate), slow password verification, and strong password storage (one-way hashing with a modern adaptive algorithm).

* Injection and unsafe data handling
If persistence uses SQL or other query layers, poorly constructed queries could admit injection. The primary control is parameterized queries / safe ORM usage, plus validated, typed inputs at API boundaries—not ad hoc “sanitize everything.”

* Authorization (especially IDOR and privilege escalation)
UI hiding is insufficient; every sensitive operation must be authorized on the server using the authenticated identity and explicit roles/permissions.

* Sessions and tokens
Weak token handling (long-lived credentials, leakage via XSS or insecure transport, or tokens stored where JavaScript can read them unnecessarily) enables session theft and impersonation. I plan time-bounded credentials, HTTPS in production, and a deliberate choice of how the client carries the credential (with awareness of XSS vs cookie trade-offs).

* Data exposure
Event and user APIs should avoid over-sharing fields and avoid information leaks via verbose errors (e.g. login responses that distinguish “unknown user” from “wrong password”).

* Planned defenses (summary)
Password hashing suitable for verifier storage (e.g. bcrypt/argon2-style work factors), bounded-lifetime credentials, server-side authorization on protected routes and mutating actions, safe database access patterns, login rate limiting, and production-facing transport and error-handling hygiene.