# HCM Lite — AI-Assisted HR System

An open-source, full-stack HR management system with three roles: **Admin**, **HR**, and **Employee**. Built with Node.js/Express/MongoDB on the backend and React/Vite/Tailwind on the frontend.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js (CommonJS), Express 4, Mongoose 8, Zod |
| Auth | JWT (Bearer token), bcryptjs |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Jest, Supertest, mongodb-memory-server |
| Client | React 18, Vite 5, Tailwind CSS 3 |
| UI | Radix UI primitives, Lucide React icons |
| HTTP | Axios (with auto token injection & 401 handling) |
| Routing | React Router v6 |

---

## Local Development

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB)

### 1. Clone & Install

```bash
# Server
cd server
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET
npm install
npm run dev                # starts on PORT 5000 (nodemon)

# Client (new terminal)
cd client
cp .env.example .env       # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                # starts on http://localhost:5173
```

### 2. First Admin Setup

**Option A — Setup Page (recommended)**
Navigate to `http://localhost:5173`. If no Admin exists you'll be redirected to `/setup`. Fill in the form and submit.

**Option B — Environment Variables**
Set these in `server/.env` before starting the server:
```
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=YourSecurePassword
COMPANY_NAME=Your Company
```
The server will create the Admin and a default Settings document on boot.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | | Token expiry (default: `7d`) |
| `CLIENT_URL` | | Allowed CORS origin (default: `http://localhost:5173`) |
| `PORT` | | Server port (default: `5000`) |
| `ADMIN_EMAIL` | | Bootstrap admin email on first boot |
| `ADMIN_PASSWORD` | | Bootstrap admin password on first boot |
| `COMPANY_NAME` | | Company name for env bootstrap (default: `My Company`) |
| `AI_API_KEY` | | Placeholder for Part 6 |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `https://your-api.onrender.com/api`) |

---

## Running Tests

```bash
cd server
npm test
```

Tests use `mongodb-memory-server` — no real database needed.

---

## Deploy

### Server → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add all env vars from `server/.env.example` in the Render dashboard

### Client → Vercel

1. Import your repository on [vercel.com](https://vercel.com)
2. Settings:
   - **Root Directory**: `client`
   - **Framework**: Vite
3. Add `VITE_API_URL` in Vercel environment variables pointing to your Render URL
4. The `client/vercel.json` already handles SPA routing rewrites

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| GET | `/api/setup/status` | None | `{initialized}` |
| POST | `/api/setup` | None | First-run setup (409 if already done) |
| POST | `/api/auth/login` | None | Login → JWT |
| GET | `/api/auth/me` | Bearer | Current user |
| POST | `/api/auth/change-password` | Bearer | Change password |
| POST | `/api/auth/logout` | Bearer | Logout |
| GET | `/api/settings` | Admin, HR | Get settings |
| PUT | `/api/settings` | Admin | Update settings |
| GET | `/api/org/departments` | Admin, HR | List departments |
| POST | `/api/org/departments` | Admin | Create department |
| PUT | `/api/org/departments/:id` | Admin | Update / toggle active |
| GET | `/api/org/designations` | Admin, HR | List designations |
| POST | `/api/org/designations` | Admin | Create designation |
| PUT | `/api/org/designations/:id` | Admin | Update / toggle active |
| GET | `/api/org/leave-types` | Admin, HR | List leave types |
| POST | `/api/org/leave-types` | Admin | Create leave type |
| PUT | `/api/org/leave-types/:id` | Admin | Update / toggle active |
| GET | `/api/org/holidays` | Admin, HR | List holidays |
| POST | `/api/org/holidays` | Admin | Create holiday |
| DELETE | `/api/org/holidays/:id` | Admin | Delete holiday |
| GET | `/api/users` | Admin | List HR users |
| POST | `/api/users` | Admin | Create HR user (returns tempPassword) |
| PATCH | `/api/users/:id/deactivate` | Admin | Deactivate user |
| PATCH | `/api/users/:id/activate` | Admin | Activate user |
| POST | `/api/users/:id/reset-password` | Admin | Reset password (returns tempPassword) |
| GET | `/api/audit` | Admin | Paginated audit log |

---

## Manual Verification Checklist

Run these checks after setting up:

```
1.  Fresh DB  →  GET  /api/setup/status          →  {initialized: false}
2.  POST /api/setup (valid payload)               →  201, Admin created
3.  GET  /api/setup/status                        →  {initialized: true}
4.  POST /api/setup again                         →  409 Conflict
5.  POST /api/auth/login (admin creds)            →  200, JWT in body
6.  GET  /api/auth/me  (admin JWT)                →  200, no passwordHash in response
7.  POST /api/users  (admin JWT, name+email)      →  201, {user, tempPassword}
8.  POST /api/auth/login  (HR, tempPassword)      →  200, user.mustChangePassword=true
9.  GET  /api/settings  (HR JWT, mustChange=true) →  403 (mustChangePassword guard)
10. POST /api/auth/change-password  (HR JWT)      →  200
11. GET  /api/settings  (HR JWT after change)     →  200
12. PUT  /api/settings  (HR JWT)                  →  403 (role guard)
13. GET  /api/audit     (HR JWT)                  →  403 (admin only)
14. PATCH /api/users/:id/deactivate (admin JWT)   →  200
15. POST /api/auth/login (deactivated HR creds)   →  401
16. GET  /api/audit     (admin JWT)               →  200, paginated events
```

---

## Project Structure

```
hcm-lite/
├── server/
│   └── src/
│       ├── app.js                  Express app
│       ├── server.js               Entry: DB connect + boot
│       ├── config/                 env.js, db.js
│       ├── middleware/             authenticate, requireRole, scopeFilter, validate, errorHandler, rateLimit
│       ├── models/                 User, Settings, Department, Designation, LeaveType, Holiday, AuditLog
│       ├── utils/                  httpError, password, token, audit
│       ├── modules/
│       │   ├── setup/              First-run + env bootstrap
│       │   ├── auth/               Login, me, change-password, logout
│       │   ├── settings/           Company + attendance config
│       │   ├── org/                Departments, Designations, LeaveTypes, Holidays
│       │   ├── users/              HR user management (admin)
│       │   ├── audit/              Append-only log (admin)
│       │   └── [employees/ attendance/ leave/ payroll/ dashboards/ ai/]  ← Part 2–6
│       └── tests/
└── client/
    └── src/
        ├── context/                AuthContext
        ├── lib/                    api.js, utils.js
        ├── components/
        │   ├── layout/             Sidebar, Topbar, ProtectedRoute
        │   └── shared/             Loader, EmptyState, ErrorState, TempPasswordDialog
        └── features/
            ├── setup/              SetupPage
            ├── auth/               LoginPage, ChangePasswordPage
            ├── dashboard/          DashboardPage
            ├── settings/           SettingsPage
            ├── org/                Departments, Designations, LeaveTypes, Holidays
            ├── users/              HrUsersPage
            ├── audit/              AuditPage
            └── [employees/ attendance/ leave/ payroll/ ai/]  ← Part 2–6
```

---

## Security Notes

- Passwords are **never** returned in any API response (Mongoose `toJSON` strips `passwordHash`)
- JWT secret must be a long random string in production
- CORS is restricted to `CLIENT_URL` only
- Rate-limiting on login endpoint (15 req / 15 min per IP)
- `mustChangePassword` flag is enforced server-side, not just in UI
- Admin role cannot be created via API (`/api/users` always creates `hr` role)
- Audit log is append-only (no update/delete routes; pre-save hook rejects updates)
