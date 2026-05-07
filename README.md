# Vayu Fitness CRM

Local-first gym CRM and membership management system for **Vayu Fitness**.

> **Status:** Phase 1 — project setup, database schema, seed, base layout.
> Phases 2–8 (auth, dashboard data, members/leads, plans, payments, attendance, reports) follow incrementally.

---

## Tech stack

| Layer        | Choice                                                       |
| ------------ | ------------------------------------------------------------ |
| Frontend     | Next.js 15 (App Router), React 19, TypeScript, Tailwind v3, shadcn/ui |
| Backend      | Next.js Server Actions + API routes                          |
| Database     | PostgreSQL 16 (via Docker)                                   |
| ORM          | Prisma 6                                                     |
| Auth         | Auth.js v5 (database sessions) — wired in Phase 2            |
| Hashing      | Argon2id (`@node-rs/argon2`)                                 |
| Validation   | Zod, `@t3-oss/env-nextjs` for env                            |
| Logging      | pino (with PII redaction)                                    |
| Pkg manager  | pnpm                                                         |

---

## Prerequisites

1. **Node.js ≥ 20** (you have v24 — perfect)
2. **pnpm** — install with `npm install -g pnpm` if you don't have it
3. **Docker Desktop** — https://www.docker.com/products/docker-desktop/

---

## Local setup (first time)

Run these from the project root (`E:\vayu-fitness-crm`):

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + pgAdmin in Docker
pnpm db:up

# 3. Generate Prisma client + apply schema (creates the dev migration)
pnpm prisma migrate dev --name init

# 4. Seed the database with gym, admin, plans, trainers, 5 members, 5 leads
pnpm db:seed

# 5. Start the dev server
pnpm dev
```

Open http://localhost:3000 — you'll be redirected to `/dashboard` and should see live counts from the seed data.

### Default admin credentials

The seed script creates an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in your local `.env`. If those aren't set, it falls back to safe placeholders (`admin@example.com` / `change-me-before-deploy`) — change them in your `.env` before running the seed.

```
Role: Super Admin
```

### pgAdmin (optional GUI)

- URL: http://localhost:5050
- Email: `admin@vayu.local`
- Password: `admin`
- Add server → host `postgres`, port `5432`, user `vayu`, password `vayu_dev_password`

---

## Common scripts

```bash
pnpm dev              # Next dev server
pnpm build            # Production build
pnpm start            # Run prod build
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint
pnpm format           # Prettier write

pnpm db:up            # docker compose up -d
pnpm db:down          # docker compose down
pnpm db:reset         # Wipe DB + re-migrate + re-seed (destructive!)
pnpm db:studio        # Prisma Studio GUI at http://localhost:5555
pnpm db:migrate       # Create/apply a new migration
pnpm db:seed          # Re-run seed (idempotent)
pnpm db:generate      # Re-generate Prisma client
```

---

## Project structure

```
vayu-fitness-crm/
├── docker-compose.yml      # Postgres + pgAdmin
├── prisma/
│   ├── schema.prisma       # Full DB schema (all 25 models)
│   └── seed.ts             # Seed script
├── src/
│   ├── app/
│   │   ├── (auth)/login/   # Login (Phase 2)
│   │   ├── (dashboard)/    # All authenticated pages share sidebar layout
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/         # Sidebar, Topbar
│   │   └── ui/             # shadcn components (Button)
│   ├── lib/
│   │   ├── auth/password.ts  # Argon2id hash/verify
│   │   ├── env.ts            # Type-safe env vars
│   │   ├── logger.ts         # pino with PII redaction
│   │   ├── money.ts          # Paise helpers
│   │   ├── prisma.ts         # Singleton Prisma client
│   │   └── utils.ts          # cn() class merger
│   ├── constants/
│   │   ├── brand.ts            # Vayu brand info
│   │   ├── business-rules.ts   # Freeze/installment/etc rules
│   │   └── nav.ts              # Sidebar items
│   ├── server/
│   │   ├── actions/        # Server Actions (Phase 2+)
│   │   └── services/       # Business logic services (Phase 2+)
│   ├── types/
│   └── hooks/
└── README.md
```

---

## What's already in the schema

The schema is **MVP-complete and future-proofed**:

- **All 22+ models** from the spec (User, Member, Lead, MembershipPlan, MemberMembership, MembershipFreeze, Payment, PaymentInstallment, Invoice, Attendance, Class, Notification, AuditLog, Setting, etc.)
- **Multi-branch ready** — every operational row carries `gymId` + `branchId`
- **Soft deletes everywhere** (`deletedAt DateTime?`)
- **Money in paise** (`Int`) — no float drift on invoices
- **Atomic invoice numbering** (`InvoiceCounter` table) — no duplicate invoice numbers under load
- **Auth.js v5 tables** (`Account`, `Session`, `VerificationToken`)
- **Webhook stub** (`WebhookEvent`) — drops in for Razorpay / WhatsApp later
- **Biometric-ready attendance** — `Attendance` (one per day) + `AttendanceLog` (multi IN/OUT)
- **2FA-ready user model** — `totpSecret` field, unused in MVP
- **PII-redacted logging** via pino

---

## What's next

| Phase | Scope                                                      |
| ----- | ---------------------------------------------------------- |
| **1** | ✅ Project setup, schema, seed, base layout (you are here) |
| 2     | Auth.js v5 login, protected routes, role guards, audit on login |
| 3     | Dashboard — real charts, alerts, recent activity feed      |
| 4     | Members CRUD, Leads CRUD, follow-ups, lead → member convert |
| 5     | Plans CRUD, assign membership, renew, freeze (max 30 days) |
| 6     | Payments, GST invoice with print, annual installment tracking |
| 7     | Daily attendance, prevent duplicates, attendance reports   |
| 8     | Reports, settings, audit log viewer                        |

After Phase 1 boots cleanly, ping me to start Phase 2.
