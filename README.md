# PenguWave: Security Operations Portal

PenguWave is a full-stack security operations portal with authentication, role-based authorization, user management, and protected events APIs.

## Architecture

- **Frontend**: React + Vite + TypeScript (`src`)
- **Backend**: Express + TypeScript (`server/src`)
- **Database**: PostgreSQL (`server/db/schema.sql`)
- **Mock security data**: JSON file loaded by backend (`data/mock_events.json`)

## How to Run

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Docker with PostgreSQL)

### 1) Start PostgreSQL and create a database

Set an environment variable for the backend:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/penguwave"
```

### 2) Install dependencies

```bash
npm install
cd server && npm install
```

### 3) Migrate and seed

```bash
cd server
npm run build
npm run db:setup
```

### 4) Run backend and frontend

Backend:

```bash
cd server
npm run dev
```

Frontend (separate terminal):

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

If needed, set frontend API target:

```bash
export VITE_API_URL="http://localhost:3001"
```

For cross-origin local runs, set:

```bash
export CORS_ORIGIN="http://localhost:5173"
```

## Authentication

- Login uses `POST /api/auth/login` with email + password.
- Passwords are stored as bcrypt hashes in PostgreSQL.
- On successful login, backend issues a signed JWT and stores it in an **HttpOnly cookie** (`penguwave_access_token`).
- Cookie flags:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` in production
- Frontend sends cookies with `credentials: include`.
- `GET /api/auth/me` restores session state after page refresh.
- `POST /api/auth/logout` clears the auth cookie.

## Authorization Model

- **Roles**: `admin`, `analyst`, `viewer`
- **Status**: `active`, `disabled`
- `/api/users/*` requires admin role.
- `/api/events/*` requires authenticated + active user.
- Event access control:
  - `admin`: can read all events
  - non-admin users: can read only events where `event.userId === req.user.id`
- For privileged endpoints, role/status is re-checked from DB, not trusted only from JWT claims.

## Security Controls Implemented

- Input validation with `zod`
- Password hashing with `bcrypt`
- Login rate limiting (`express-rate-limit`)
- JWT signature validation with pinned algorithm (`HS256`)
- HttpOnly cookie session token
- SQL parameterized queries (`pg`)
- Secure HTTP headers (`helmet`)
- CORS origin allowlist + credentialed requests
- Protected resource checks (`requireAuth`, `requireActiveUser`, `requireAdmin`)
- Consistent internal error masking (generic `500` response)

## Assignment Deliverables

- API contract: `docs/api_contract.md`
- Threat thinking document: `docs/threat-model.md`

## Production Secure Deployment Notes

1. **Secrets management**
   - Store `JWT_SECRET` and `DATABASE_URL` in a secrets manager.
   - Use long random `JWT_SECRET` and rotate periodically.
2. **Transport security**
   - Terminate TLS at load balancer/reverse proxy.
   - Enforce HTTPS only and HSTS.
3. **Cookie/session hardening**
   - Keep `Secure` cookies enabled.
   - Consider short-lived access token + refresh token rotation.
4. **Database security**
   - Private network only; no public DB access.
   - Least-privilege DB user and regular backups.
5. **Monitoring and auditing**
   - Centralized logs for login failures, admin actions, and 4xx/5xx spikes.
   - Alerting on brute-force patterns and suspicious privilege changes.
6. **Operational safeguards**
   - Automated dependency vulnerability scanning.
   - CI checks for lint, typecheck, and security regressions.
