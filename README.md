# TaskFlow Enterprise

Enterprise-style Angular task management app with:
- role-based access control
- team workspaces
- approvals
- drag-and-drop team board
- Supabase auth + database

---

## What This Project Includes

- Multi-role platform (`super_admin`, `admin`, `manager`, `member`)
- Team-scoped roles (`leader`, `officer`, `member`)
- Tasks with workflow statuses (`todo`, `in_progress`, `review`, `done`, `cancelled`)
- Team board with status/assignee drag-and-drop
- Task approvals, comments, subtasks, attachments, notifications
- Audit logging
- Dashboard panels per role

---

## Project Structure

```text
tasks-app/
├─ src/
│  ├─ app/
│  │  ├─ core/                  # Domain models, guards, services, interceptors
│  │  │  ├─ guards/             # AuthGuard, RoleGuard, GuestGuard
│  │  │  ├─ interceptors/       # Auth + logging interceptors
│  │  │  ├─ models/             # database.types.ts, permissions.ts
│  │  │  ├─ services/           # auth, team, tasks-db, audit, comments, etc.
│  │  │  └─ supabase.client.ts  # Supabase client configuration
│  │  ├─ features/
│  │  │  ├─ auth/               # login/register/forgot password
│  │  │  ├─ tasks/              # task list/detail + task components
│  │  │  ├─ teams/              # team list/detail/join + team board
│  │  │  ├─ users/              # admin user management
│  │  │  └─ panels/             # role dashboards (member/manager/admin/super-admin)
│  │  ├─ layout/                # navbar + sidebar
│  │  ├─ shared/                # reusable UI components, pipes, directives
│  │  ├─ app.module.ts
│  │  └─ app-routing.module.ts  # lazy loaded feature routes
│  ├─ environments/
│  │  ├─ environment.ts
│  │  └─ environment.prod.ts
│  ├─ main.ts
│  └─ styles.css
├─ supabase-schema.sql           # base schema
├─ supabase-schema-v2.sql        # extended schema (teams + advanced features)
├─ angular.json
├─ package.json
└─ README.md
```

---

## Tech Stack

- Angular 17 (NgModules + lazy loading)
- Angular CDK (drag/drop)
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS
- RxJS

---

## Run Locally on a New Device (First Time Setup)

### 1) Prerequisites

Install:
- [Node.js 20+](https://nodejs.org/) (or current LTS)
- npm (comes with Node)
- Angular CLI (optional global):  
  `npm install -g @angular/cli`

Verify:
```bash
node -v
npm -v
```

### 2) Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd tasks-app
```

### 3) Install dependencies

```bash
npm install
```

### 4) Configure Supabase

You need a Supabase project and valid keys.

1. Create/open project: [https://supabase.com](https://supabase.com)
2. In SQL Editor, run:
   - `supabase-schema.sql`
   - `supabase-schema-v2.sql`
3. Copy your **Project URL** and **anon/publishable key**
4. Update:
   - `src/environments/environment.ts`
   - `src/environments/environment.prod.ts`

Example:
```ts
export const environment = {
  production: false,
  supabase: {
    url: 'https://YOUR_PROJECT.supabase.co',
    anonKey: 'YOUR_ANON_OR_PUBLISHABLE_KEY'
  }
};
```

### 5) Start the app

```bash
npm start
```
or
```bash
npx ng serve
```

Open: [http://localhost:4200](http://localhost:4200)

If port `4200` is busy:
```bash
npx ng serve --port 4201
```

---

## Useful Commands

```bash
# Development server
npm start

# Build
npm run build

# Watch build
npm run watch

# Tests
npm test
```

---

## Notes for Contributors

- Routing is role-protected via guards in `src/app/core/guards`.
- Permission checks are centralized in `src/app/core/models/permissions.ts`.
- Team + task workflows are primarily implemented in:
  - `src/app/core/services/team.service.ts`
  - `src/app/core/services/tasks-db.service.ts`
- UI shell and navigation are in:
  - `src/app/layout/sidebar/sidebar.component.ts`
  - `src/app/layout/navbar/navbar.component.ts`

---

## Troubleshooting

- **Gets logged out on refresh**  
  Check session handling in `auth.service.ts` and Supabase client config in `supabase.client.ts`.

- **Drag/drop or approvals failing**  
  Verify DB policies and team schema from `supabase-schema-v2.sql` are fully applied.

- **Build errors after pull**  
  Run:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

