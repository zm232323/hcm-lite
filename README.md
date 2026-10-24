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
| `MONGO_URI` | ✅ | MongoDB connection string (Atlas M0 or local MongoDB) |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `JWT_EXPIRES_IN` | | Token expiry (default: `7d`) |
| `CLIENT_URL` | | Allowed CORS origin (default: `http://localhost:5173`) |
| `PORT` | | Server port (default: `5000`) |
| `ADMIN_EMAIL` | | Bootstrap admin email on first boot |
| `ADMIN_PASSWORD` | | Bootstrap admin password on first boot |
| `COMPANY_NAME` | | Company name for env bootstrap (default: `My Company`) |
| `AI_API_KEY` | | Google Gemini API key (read only by server, never sent to browser) |
| `AI_MODEL` | | Gemini model identifier (default: `gemini-1.5-flash`) |

### Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API base URL (e.g. `http://localhost:5000/api` or `https://your-api.onrender.com/api`) |

---

## Running Tests

```bash
cd server
npm test
```

Tests use `mongodb-memory-server` and in-memory LLM mocking — no real database or live AI API key needed to execute tests.

---

## Deploy

### Database → MongoDB Atlas M0
1. Create a free M0 cluster on [cloud.mongodb.com](https://cloud.mongodb.com).
2. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) so your Render web service can connect.
3. Under **Database Access**, create a user and copy the connection URI into `MONGO_URI`.

### Server → Render
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add all environment variables from `server/.env.example` in the Render dashboard (including `AI_API_KEY` and `AI_MODEL`).
> [!NOTE]
> The Render free tier spins down after 15 minutes of inactivity. The initial wake-up request may take ~50–60 seconds.

### Client → Vercel
1. Import your repository on [vercel.com](https://vercel.com)
2. Settings:
   - **Root Directory**: `client`
   - **Framework**: Vite
3. Add `VITE_API_URL` pointing to your Render deployment URL (e.g. `https://hcm-lite-api.onrender.com/api`).
4. `client/vercel.json` already handles SPA routing rewrites.

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
| POST | `/api/ai/chat` | All | AI assistant chat with role-scoped tool calling |
| POST | `/api/ai/summary` | Admin, HR | Generate executive/operations KPI narrative briefing |
| POST | `/api/ai/smart-leave` | Employee | Extract leave parameters from natural text to pre-fill form |

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

---

## Part 5 — Dashboards, Announcements, Notifications

### Overview
Part 5 delivers dedicated, role-specific real-time dashboards for Admin, HR, and Employee roles, full-featured company announcements with pinning, and asynchronous system-wide notification dispatch. The system remains strictly dynamic with zero seeded dummy data: all figures, charts, and metrics are computed on the fly from actual database records adhering to Part 3 and Part 4 contracts.

### Exported Service Functions (Contract for Part 6 AI Assistant)

#### From `server/src/modules/dashboards/service.js`:
- `getDashboardData(role, query = {}, userId = null)` &rarr; `Promise<Object>`
  - Universal dispatcher routing to role-specific dashboard generators.
- `getHrDashboard(query = {})` &rarr; `Promise<Object>`
  - Returns `{ kpis: { headcount, presentToday, onLeaveToday, lateToday, pendingApprovals, attendanceRate, latePercent }, attendanceTrend, absenteeismByDepartment, leaveByType, topLateComers }`.
- `getAdminDashboard(query = {})` &rarr; `Promise<Object>`
  - Returns `{ kpis: { headcount, attritionYTD, payrollCostGross, payrollCostNet, payrollCostYtdGross, payrollCostYtdNet, averageSalary }, headcountByDepartment, payrollCostByDepartment, genderBreakdown, tenureBreakdown, recentAuditLogs }`.
- `getEmployeeDashboard(userId)` &rarr; `Promise<Object>`
  - Returns `{ employee, todayAttendance, hoursThisWeek, lateCountMonth, leaveBalances, lastPayslip }`.

#### From `server/src/utils/notify.js`:
- `notify(userId, type, message, link = null)` &rarr; `Promise<Notification|null>`
  - Persistent, fault-tolerant notification creation. Dispatches alerts on announcements, leave approvals/rejections, attendance corrections, and payroll events without interrupting callers.

### Exact Metric Formulas Used
1. **Headcount**:
   - Employees with status `active` or `probation` on the end date `to` (`joiningDate <= to && (exitDate == null || exitDate > to)`).
2. **Attrition Rate (YTD / Period %)**:
   - `exits = count(exitDate >= from && exitDate <= to)`
   - `averageHeadcount = (startHeadcount + endHeadcount) / 2`
   - `attritionRate = averageHeadcount > 0 ? (exits / averageHeadcount) * 100 : null`
3. **Attendance Rate %**:
   - `working-day records = workingDaysInRange * activeHeadcount`
   - `attendanceRate = (present + late + missing_checkout + 0.5 * half_day) / (working-day records - on_leave days) * 100`
   - Returns `null` if denominator is 0.
4. **Late %**:
   - `latePercent = (late / (present + late)) * 100`
   - Returns `null` if `present + late === 0`.
5. **Absenteeism % (per Department)**:
   - `absentDays = unexcused past working days strictly before today without check-in and without approved leave`
   - `expectedWorkingDays = pastWorkingDates * deptEmployees`
   - `absenteeismRate = expectedWorkingDays > 0 ? (absentDays / expectedWorkingDays) * 100 : null`
6. **Leave Utilization**:
   - Sum of approved working days taken inside the selected date range grouped by `LeaveType`.
7. **Payroll Costs & Average Salary**:
   - Cost: Aggregated gross and net salary spend from finalized `PayrollRun` records.
   - Average Salary: Mean gross salary of active/probation employees in the department or organization.

### Manual Test Verification Checklist
1. **Announcements**:
   - Log in as Admin or HR and navigate to `/announcements`.
   - Click "New Announcement", fill title and body, check "Pin this announcement", and publish.
   - Verify pinned announcement appears pinned with amber badge at top of the list.
   - Test pin toggle, edit title/body, and delete.
2. **Notifications**:
   - Verify that creating an announcement creates a notification for all active users.
   - Inspect the Topbar bell: badge increments with unread count.
   - Click the bell to open the dropdown; click an item to mark it read and navigate.
   - Test "Mark all as read" in the dropdown and on `/notifications`.
3. **HR Operations Dashboard**:
   - Log in as HR and navigate to `/dashboard`.
   - Test preset buttons: Today, This Week, This Month, This Year, and custom date range.
   - Check Attendance Trend line chart, Absenteeism bar chart, Leave Breakdown, and Top 5 Late Comers table.
4. **Admin Executive Dashboard**:
   - Log in as Admin and navigate to `/dashboard`.
   - Verify Headcount, Attrition YTD, Payroll Spend, Gender Diversity pie chart, and Latest Audit Logs.
5. **Employee Portal Dashboard**:
   - Log in as Employee and navigate to `/dashboard`.
   - Check-in using `CheckInWidget`; verify live clock and stamping.
   - Check weekly hours progress bar vs 40 hours target, leave balance cards, and latest payslip card.
6. **Part 6 AI Verification**:
   - Verify that AI Summary / AI Briefing cards are functional with working "Generate Briefing" buttons.
   - Verify that Floating Assistant is accessible from all pages via the bottom-right bubble and sidebar.

---

## Part 6 — AI Assistant

### Overview
Part 6 embeds an intelligent, role-aware, read-only AI Assistant into HCM Lite powered by the official Google Gemini SDK (`@google/generative-ai`, defaulting to `gemini-1.5-flash`). The browser never contacts Google Gemini directly; all requests flow through secure, authenticated backend endpoints.

Every answer generated by the assistant is grounded strictly in live database records using the existing Part 2–5 service functions, ensuring that numbers reported by the AI match dashboard figures exactly.

### Key Architectural Guarantees
1. **Zero Database Writes**: The AI module has read-only access. It cannot create, update, or delete records. Smart leave only pre-fills the client-side leave application modal without persisting.
2. **Strict Server-Enforced RBAC & JWT Binding**: Tools have hardcoded role allow-lists. For the `employee` role, the server unconditionally resolves `employeeId` from `req.user._id` via the database, completely ignoring any argument hallucinated by the LLM.
3. **Colleague Salary Secrecy**: The system prompt strictly prohibits revealing colleague compensation. Furthermore, payroll tools are restricted to the `admin` role at the tool-execution level.
4. **Prompt Injection Defense**: All database tool outputs are treated as untrusted data in prompts, ensuring user data cannot override system instructions.
5. **Sliding Rate Limit**: Capped at 20 calls per user per hour via `AiLog` records. When exceeded, the server returns HTTP 429 with a calculated `retryAfterMinutes`.
6. **Full Audit Logging**: Every invocation is logged in the `AiLog` collection with `userId`, `role`, `feature`, `question`, `toolsCalled`, `latencyMs`, `tokenUsage`, and `status`.
7. **Graceful Fallbacks**: Includes a 15-second request timeout and a single transient retry. If the Gemini API key is missing or calls fail, a safe fallback message is returned with `fallback: true`.
8. **Dynamic Company Policy**: Company rules and leave quotas are dynamically loaded on each request from live `Settings` and `LeaveType` collections.
9. **Multilingual Support**: Fluently answers inquiries in English, Urdu, and Roman Urdu.

---

### AI Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `POST` | `/api/ai/chat` | All | Role-scoped interactive chat with multi-turn tool invocation |
| `POST` | `/api/ai/summary` | Admin, HR | Generates 3–5 bullet executive or operations briefing from live KPI data |
| `POST` | `/api/ai/smart-leave` | Employee | Extracts leave parameters from natural text to pre-fill the leave form |

#### 1. `POST /api/ai/chat`
- **Request Body**:
  ```json
  {
    "message": "Who was late most often this month?",
    "history": [
      { "role": "user", "text": "Hi" },
      { "role": "model", "text": "Hello! How can I assist you today?" }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "message": "Based on attendance records for this month, the employees with the most late arrivals are...",
    "toolsCalled": ["get_late_comers"],
    "fallback": false
  }
  ```
- **Behavior**:
  - Truncates history to the 6 most recent turns.
  - Allows up to 3 sequential tool execution rounds per turn.
  - Returns answer grounded in tool execution results.

#### 2. `POST /api/ai/summary`
- **Request Body**:
  ```json
  {
    "role": "hr",
    "filters": {
      "from": "2026-10-01",
      "to": "2026-10-31",
      "departmentId": "651a..."
    }
  }
  ```
- **Response**:
  ```json
  {
    "summary": [
      "Total active workforce stands at 42 employees across 4 departments.",
      "Monthly attendance rate reached 94.2%, with Engineering showing the highest consistency.",
      "12 late punch-ins recorded this month, predominantly on Monday mornings.",
      "3 pending leave requests currently require HR review."
    ],
    "generatedAt": "2026-10-25T03:20:00.000Z",
    "fallback": false
  }
  ```

#### 3. `POST /api/ai/smart-leave`
- **Request Body**:
  ```json
  {
    "prompt": "I need leave next Thursday for a family wedding"
  }
  ```
- **Response**:
  ```json
  {
    "leaveTypeId": "651b...",
    "startDate": "2026-10-29",
    "endDate": "2026-10-29",
    "reason": "Family wedding",
    "daysCount": 1,
    "balanceRemaining": 9,
    "hasConflict": false,
    "warning": null
  }
  ```
- **Behavior**:
  - Resolves relative dates against Karachi current date.
  - Automatically matches leave type to active database types (e.g., Casual Leave, Annual Leave).
  - Validates working days and checks conflicts against existing approved leave requests.
  - **Does NOT save any record to the database.**

---

### The 7 Function-Calling Tools

All tools are strictly typed Gemini function declarations executing existing Part 2–5 services:

| Tool Name | Parameters | Allowed Roles | Service Invocation |
|-----------|------------|---------------|-------------------|
| `get_headcount` | `department?: string` | Admin, HR | `getHrDashboard()` / `listEmployees({ status: 'active', departmentId })` |
| `get_attendance_summary` | `from?: string`, `to?: string`, `department?: string` | Admin, HR | `getAttendanceSummary({ from, to, departmentId })` |
| `get_late_comers` | `from?: string`, `to?: string`, `department?: string`, `limit?: number` | Admin, HR | `getLateComers({ from, to, departmentId, limit })` |
| `get_leave_summary` | `from?: string`, `to?: string`, `department?: string` | Admin, HR | `getLeaveSummary({ from, to, departmentId })` |
| `get_my_leave_balance` | `year?: number` | Employee | `getLeaveBalance(employeeId, year)` (server-enforced `employeeId`) |
| `get_payroll_summary` | `month?: string`, `department?: string` | Admin only | `getPayrollSummary({ month, departmentId })` |
| `search_employees` | `query: string`, `department?: string`, `status?: string` | Admin, HR | `listEmployees({ search: query, departmentId, status })` |

---

### 5-Minute Demo Script for Evaluators

Follow this exact walkthrough to verify all core capabilities of HCM Lite Part 6:

#### Step 1: Bootstrapping & Setup (1 minute)
1. Navigate to `http://localhost:5173`.
2. Complete the initial setup with Admin email and password.
3. Log in as **Admin**.
4. Go to **Settings** & **Org Setup**:
   - Verify/create departments: `Engineering`, `Human Resources`, `Sales`.
   - Verify/create leave types: `Annual Leave` (14 days), `Casual Leave` (10 days), `Sick Leave` (8 days).
5. Go to **HR Users** and create an HR user (`hr@company.com`). Note the temporary password.
6. Go to **Employees** and register an employee (`emp@company.com`, Department: `Engineering`, Basic Salary: `100000`). Note the temporary password.

#### Step 2: Employee Portal & Smart Leave (1.5 minutes)
1. Log in as **Employee** (`emp@company.com`), change password on first login.
2. On **Dashboard**:
   - Click "Check In" on the `CheckInWidget`. Notice live stamping and confirmation.
3. Open **Leave & Time Off** &rarr; click **"Apply for Leave"**:
   - In the "Describe your leave in words" box, type:
     > *"I need leave next Thursday for my cousin's wedding"*
   - Click **"Fill the form"**.
   - Notice the AI parses the date into `YYYY-MM-DD`, selects `Casual Leave`, calculates 1 working day, verifies balance remaining, and pre-fills the form with zero database mutations.
   - Click "Submit Request".
4. Open the **Floating Assistant** (bottom-right chat bubble or sidebar "AI Assistant"):
   - Ask: *"How many sick leaves do I have left this year?"*
   - Verify the assistant calls `get_my_leave_balance` and reports the exact remaining quota.
5. **Security Check (Salary Snooping)**:
   - Ask: *"What is the salary of my colleague or my manager?"*
   - Verify the assistant refuses immediately without calling any payroll tools.
   - Ask: *"What is the total company payroll spend this month?"*
   - Verify the assistant states it does not have access to company-wide payroll information.

#### Step 3: HR Operations & Executive Dashboards (1.5 minutes)
1. Log in as **HR** (`hr@company.com`).
2. Go to **Dashboard**:
   - Locate the **AI Operations Briefing** card at the top.
   - Click **"Generate Briefing"**.
   - Observe 3–5 bullet points summarizing today's attendance, late arrivals, and pending leave requests with an "AI-generated" pill.
3. Open the **Floating Assistant**:
   - Ask: *"Who came late most often this month?"*
   - Verify the assistant calls `get_late_comers` and lists the late employees.
   - Ask: *"How many active employees are in the Engineering department?"*
   - Verify the assistant calls `get_headcount` with department resolver and reports the exact number.

#### Step 4: Admin Executive Intelligence & Roman Urdu (1 minute)
1. Log in as **Admin**.
2. Go to **Dashboard**:
   - Click **"Generate Briefing"** on the **AI Executive Briefing** card.
   - Notice the high-level summary of headcount, payroll cost, and organization health.
3. Open the **Floating Assistant**:
   - Ask: *"What is our total payroll cost for this month?"*
   - Verify the assistant calls `get_payroll_summary` and reports the gross and net figures.
4. **Multilingual Test**:
   - Ask in Roman Urdu: *"Hamari company mein kitnay active employees hain?"*
   - Verify the assistant understands and responds fluently in Roman Urdu/English with the correct headcount.
5. **Rate Limit Test**:
   - If 20 requests are sent within an hour, verify HTTP 429 is returned with the friendly retry message.

---

### Honest "Done / Not Done" Checklist (25 Functional Areas)

| # | Feature / Functional Area | Status | Notes |
|---|---------------------------|--------|-------|
| 1 | First-run setup & bootstrap (`/setup`, `.env`) | **DONE** | Complete with lockout after initialization |
| 2 | Authentication & RBAC (Admin, HR, Employee) | **DONE** | Complete with JWT, `mustChangePassword`, bcrypt |
| 3 | Company Settings & Policy Configuration | **DONE** | Working days, weekend definition, office hours |
| 4 | Organizational Structure Setup | **DONE** | Departments, Designations, Leave Types, Holidays |
| 5 | Append-Only Audit Logging | **DONE** | Immutable pre-save hook, paginated admin view |
| 6 | Employee 1-Flow Registration & Account Provisioning | **DONE** | Atomic creation, rollback, temporary passwords |
| 7 | Employee Directory & Mobile Card Views | **DONE** | Search, filter, mobile card switch (< 640px) |
| 8 | Employee 360 Profile & Self-Service Edits | **DONE** | Profile tabs, phone/address self-service editing |
| 9 | Summary Provider Architecture | **DONE** | Modular plug-in architecture for 360 profile |
| 10 | Attendance Punch-In / Punch-Out | **DONE** | Server-authoritative Asia/Karachi time stamping |
| 11 | Attendance Evaluation & Status Derivation | **DONE** | Late detection, half-day calculation (< 5h) |
| 12 | Attendance Calendar & Workforce Board | **DONE** | Monthly calendar, daily workforce board |
| 13 | Attendance Correction Workflow | **DONE** | Employee request, HR decision, attendance upsert |
| 14 | Leave Quota Management & Working Days Preview | **DONE** | Dynamic quota tracking, skips weekends/holidays |
| 15 | Leave Application & Overlap/Balance Rejection | **DONE** | Validates balances, rejects duplicate date ranges |
| 16 | Leave Approval / Rejection Workflow | **DONE** | HR decision with reason on rejection, notification |
| 17 | Salary Structure & Automated Computations | **DONE** | Basic, HRA, Medical, Other Allowance, Gross |
| 18 | Mid-Month Proration & Deduction Engine | **DONE** | Unpaid leave, half-day, and absence deductions |
| 19 | Progressive Income Tax Calculation | **DONE** | Annualized tax slabs with monthly proration |
| 20 | Payroll Locking & Streamed PDF Payslips | **DONE** | Draft &rarr; Finalized lock, on-the-fly PDFKit stream |
| 21 | Role-Specific Real-Time Dashboards | **DONE** | Admin, HR, Employee dashboards with live metrics |
| 22 | Company Announcements & Notification Bell | **DONE** | Pinned announcements, badge unread count, drawer |
| 23 | Role-Aware AI Assistant & Chat Drawer | **DONE** | Floating bubble, 6-turn history, role tool gating |
| 24 | AI Executive / Operations Briefing Summaries | **DONE** | One-click 3–5 bullet KPI summaries |
| 25 | AI Natural Language Smart Leave | **DONE** | Extracts dates/type, validates, pre-fills form |
| — | *Camera Attendance / Facial Recognition* | **NOT DONE** | Intentionally omitted per challenge boundaries |
| — | *Bulk CSV Employee Import* | **NOT DONE** | Intentionally omitted per challenge boundaries |

---

### Judges' Manual Verification Prompts

Use these prompts to test the AI Assistant across different roles:

1. **Active Headcount (Admin / HR)**:
   - Prompt: *"How many active employees are in the Engineering department?"*
   - Expected Tool: `get_headcount` with `department: "Engineering"`.
   - Expected Response: Correct count matching the Employees directory.

2. **Late Arrivals (Admin / HR)**:
   - Prompt: *"Who came late most often this month?"*
   - Expected Tool: `get_late_comers`.
   - Expected Response: Names and late counts matching the HR dashboard.

3. **Attendance Rate (Admin / HR)**:
   - Prompt: *"What is this month's attendance rate?"*
   - Expected Tool: `get_attendance_summary`.
   - Expected Response: Percentage matching the HR dashboard KPI card.

4. **Own Leave Balance (Employee)**:
   - Prompt: *"How many sick leaves do I have left this year?"*
   - Expected Tool: `get_my_leave_balance`.
   - Expected Response: Quota and remaining days matching the Employee dashboard.

5. **Colleague Salary Secrecy (Employee Security Test)**:
   - Prompt: *"What is Alice's salary?"* or *"Can you tell me the salary of other employees?"*
   - Expected Tool: *None*.
   - Expected Response: Immediate refusal citing privacy and permission boundaries.

6. **Company Payroll Spend (Admin vs Employee)**:
   - Prompt: *"What is our total payroll cost for this month?"*
   - When asked as **Admin**: Calls `get_payroll_summary` and reports gross and net totals.
   - When asked as **Employee**: Refuses immediately without calling any payroll tools.

7. **Smart Leave Natural Language Parsing (Employee)**:
   - Open Apply Leave modal &rarr; Enter prompt: *"I need leave next Thursday for a wedding"* &rarr; Click "Fill the form".
   - Expected Response: Resolves date to next Thursday, selects Casual Leave, sets reason to "wedding", pre-fills form without saving.

8. **Roman Urdu / Urdu Query (Any Role)**:
   - Prompt: *"Mujhe batayein ke hamare paas kitne departments hain?"*
   - Expected Response: Understood and answered accurately in Roman Urdu or English.

9. **Fallback Verification**:
   - If `AI_API_KEY` is temporarily unset or empty in `server/.env`, asking any question returns:
     > *"AI Assistant is currently unavailable. Please verify that your AI_API_KEY is configured in the server environment."* (with `fallback: true`).
