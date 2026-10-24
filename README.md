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

---

## Part 2 — Employees

Part 2 introduces the **Employee** domain, managing workforce records and their linked employee portal logins.

### Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/api/employees/export` | HR | Export matching employees as RFC 4180 CSV |
| `POST` | `/api/employees/import?dryRun=true` | HR | CSV import with diagnostic validation dry-run |
| `GET` | `/api/employees` | All | Directory list with search & filters (scopd to self for employee role) |
| `POST` | `/api/employees` | HR | Register employee + linked User account (returns temp password once) |
| `PATCH` | `/api/employees/me` | Employee | Update own contact information (phone and address only) |
| `GET` | `/api/employees/:id` | All | Employee 360 profile with summary providers (self or Admin/HR only) |
| `PUT` | `/api/employees/:id` | HR | Update details/status (exited status requires exitDate & deactivates login) |

### Key Features
1. **One-Flow Registration**: Atomic creation of both the Employee profile and linked User account (`mustChangePassword: true`), with cleanup rollback on failure so no orphan Users exist.
2. **Strict RBAC & Scoping**:
   - Admin & HR see full directory.
   - Employee role calling `/api/employees` receives **only** their own record.
   - `basicSalary` is protected and visible only to Admin, HR, or the employee viewing their own profile.
3. **Account Deactivation on Exit**: Marking an employee as `exited` requires an `exitDate` and disables their portal login account (`isActive: false`).
4. **Summary Provider Registry**: The employee service exposes `registerSummaryProvider(name, fn)` so Parts 3 (Attendance), 4 (Leave), and 5 (Payroll) can plug in without modifying the employee module.
5. **Mobile Responsiveness**: The employees table automatically switches to a stacked card layout on mobile viewports (< 640px / 375px).

---

## Part 3 — Attendance & Leave

Part 3 implements server-authoritative time attendance and quota-managed leave workflows. All dates and times are evaluated in **Asia/Karachi** (UTC+5).

### Attendance Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/attendance/check-in` | Employee | Punch in with server timestamp; checks weekend, holiday, approved leave; computes `isLate` |
| `POST` | `/api/attendance/check-out` | Employee | Punch out; computes worked hours; assigns `half_day` if < 5 hrs |
| `GET` | `/api/attendance/me?month=YYYY-MM` | Employee | Monthly calendar with derived day statuses, times, and worked hours |
| `GET` | `/api/attendance/board?date=YYYY-MM-DD` | HR, Admin | Workforce attendance board for all active employees on date |
| `POST` | `/api/attendance/corrections` | Employee | Request punch time adjustment |
| `GET` | `/api/attendance/corrections` | All | Corrections inbox (HR/Admin all; Employee own) |
| `PATCH` | `/api/attendance/corrections/:id/decision` | HR | Approve/Reject correction (upserts attendance record & audits) |

### Leave Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/api/leave/preview` | Employee | Live preview of working days (skipping weekends & holidays) and quota check |
| `GET` | `/api/leave/balance` | All | Per-type quota breakdown (`quota`, `used`, `pending`, `remaining`) |
| `GET` | `/api/leave/my` | Employee | Own leave history and status |
| `GET` | `/api/leave` | HR, Admin | All leave requests filterable by status and department |
| `POST` | `/api/leave` | Employee | Submit leave request; rejects overlap (422) and over-balance (422) |
| `PATCH` | `/api/leave/:id/cancel` | Employee | Cancel pending request or future approved leave |
| `PATCH` | `/api/leave/:id/decision` | HR | Approve/Reject request (comment required on reject; notifies employee) |

### Exported Service Functions (Contract for Parts 4, 5, 6)

#### From `server/src/modules/attendance/service.js`:
- `getDayStatus(employeeId, dateStr)` &rarr; `Promise<string>`
  - Returns `'present' | 'late' | 'half_day' | 'absent' | 'on_leave' | 'weekend' | 'holiday' | 'missing_checkout' | 'scheduled'`
- `getAttendanceSummary({ from, to, departmentId?, employeeId? })` &rarr; `Promise<Object>`
  - Returns `{ present, late, half_day, absent, on_leave, missing_checkout, totalWorkedHours, expectedWorkingDays }`
- `getLateComers({ from, to, departmentId?, limit? })` &rarr; `Promise<Array>`
  - Returns array of late Attendance documents populated with employee details
- `countWorkingDays(from, to)` &rarr; `Promise<number>`
  - Counts days between `from` and `to` excluding weekends and holidays

#### From `server/src/modules/leave/service.js`:
- `getLeaveBalance(employeeId, year?)` &rarr; `Promise<Array<Object>>`
  - Returns `[{ leaveTypeId, name, isPaid, quota, used, pending, remaining }]`
- `getApprovedLeaveDays(employeeId, from, to)` &rarr; `Promise<number>`
  - Returns sum of approved working days in range
- `getApprovedLeaveDaysByType(employeeId, from, to)` &rarr; `Promise<Array<Object>>` (Part 4 allowed addition)
  - Returns `[{ leaveTypeId, name, isPaid, days }]` split by leave type inside a date range
- `hasApprovedLeave(employeeId, dateStr)` &rarr; `Promise<boolean>`
  - Returns `true` if employee has an approved leave request on `dateStr`
- `getLeaveSummary({ from, to, departmentId? })` &rarr; `Promise<Object>`
  - Returns `{ totalApprovedDays, pendingRequestsCount, byType }`
- `getWhoIsOnLeave(dateStr)` &rarr; `Promise<Array<Object>>`
  - Returns `[{ employee, leaveType, days, startDate, endDate }]`

---

## Part 4 — Payroll Lite

### Overview
Part 4 introduces automated salary structuring, proration for mid-month joiners and leavers, attendance/leave deductions, progressive annual tax slab calculations, draft-to-finalized locking workflows, employee payslip downloads (streamed in-memory PDF), and summary providers for Employee 360.

### Exported Service Functions (Contract for Parts 5, 6)

#### From `server/src/modules/payroll/service.js`:
- `getPayrollSummary({ month?, from?, to?, departmentId?, includeDraft = false })` &rarr; `Promise<Object>`
  - Returns `{ overall: { gross, deductions, tax, net, count }, byMonth: { [month]: ... }, byDepartment: { [dept]: ... } }`
  - Only includes finalized runs unless `includeDraft: true`.
- `getAverageSalary({ departmentId?, designationId? })` &rarr; `Promise<number>`
  - Returns mean gross salary of active and probation employees based on salary structures.
- `getLastPayslip(employeeId)` &rarr; `Promise<Object|null>`
  - Returns the most recent finalized `Payslip` document snapshot for an employee.
- `getPayrollCostThisYear()` &rarr; `Promise<Object>`
  - Returns `{ year, totalGross, totalNet, runsCount }` for all finalized runs in the current calendar year.
- `computeGross(basic, hraPercent = 40, medicalPercent = 10, otherAllowance = 0)` &rarr; `number`
  - Helper to compute gross from components.

#### From `server/src/modules/payroll/tax.js`:
- `calculateAnnualTax(annualGross)` &rarr; `number`
  - Pure function computing progressive tax on annual taxable gross based on illustrative slabs.
- `calculateMonthlyTax(monthlyGross, eligibleDays, workingDays)` &rarr; `number`
  - Monthly tax proration: `round2((annualTax / 12) * (eligibleDays / workingDays))`.

#### Allowed Module Additions:
- `updateBasicSalary(employeeId, basic, actor)` in `server/src/modules/employees/service.js` &rarr; updates `Employee.basicSalary`, writes an audit log entry, and returns the updated employee.
- `getApprovedLeaveDaysByType(employeeId, from, to)` in `server/src/modules/leave/service.js` &rarr; returns approved working days per leave type with `isPaid` flag.

### Exact Formulas Used
1. **Salary Structure**:
   - `HRA = round2(basic * (hraPercent / 100))` (default `hraPercent = 40`)
   - `Medical = round2(basic * (medicalPercent / 100))` (default `medicalPercent = 10`)
   - `Gross = round2(basic + HRA + Medical + otherAllowance)` (by default, `Gross = 1.5 * basic`)
2. **Working Days & Proration**:
   - `workingDays = countWorkingDays(monthStart, monthEnd)` (skipping weekends & holidays)
   - `eligibleDays = countWorkingDays(max(monthStart, joiningDate), min(monthEnd, exitDate || monthEnd))`
   - `perDay = round2(gross / workingDays)`
   - `earnedGross = (eligibleDays === workingDays) ? gross : round2(perDay * eligibleDays)`
3. **Deductions Inside Eligible Range**:
   - `deductionDays = round2(absentDays + unpaidLeaveDays + 0.5 * halfDays)`
     - `absentDays`: working days strictly before today in `Asia/Karachi` with no attendance record and no approved leave.
     - `unpaidLeaveDays`: approved leave days with `isPaid === false`.
     - `halfDays`: attendance records with `status === 'half_day'`.
     - Late and missing_checkout are NOT deducted.
   - `deduction = round2(perDay * deductionDays)`
4. **Income Tax (Annual Slabs on `annualGross = gross * 12`)**:
   - Up to 600,000 &rarr; `0`
   - 600,001 to 1,200,000 &rarr; `5% of excess over 600,000`
   - 1,200,001 to 2,400,000 &rarr; `30,000 + 15% of excess over 1,200,000`
   - 2,400,001 to 3,600,000 &rarr; `210,000 + 25% of excess over 2,400,000`
   - Above 3,600,000 &rarr; `510,000 + 35% of excess over 3,600,000`
   - `monthlyTax = round2((annualTax / 12) * (eligibleDays / workingDays))`
5. **Net Pay**:
   - `netPay = round2(Math.max(0, earnedGross - deduction - monthlyTax))`

### Assumptions
- All calendar math and timezone operations are anchored strictly to `Asia/Karachi` via `utils/time.js`.
- For full months with no proration (`eligibleDays === workingDays`), `earnedGross` equals `gross` exactly to prevent rounding discrepancies.
- Today and future days are never counted as absent when running the current month mid-month.
- Payslips store an immutable, full snapshot of calculations so subsequent employee or salary structure updates never modify historic finalized payslips.
- PDF generation is streamed on the fly via `pdfkit` and never persisted to the filesystem.



