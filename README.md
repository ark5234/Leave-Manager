**Leave Manager**

A lightweight web app to plan and calculate internship attendance with support for full/half-day leaves, sandwich-leave penalties, 2nd/4th-Saturday rules and Gujarat public holidays (2026). The app is designed to run publicly without user accounts by default using browser LocalStorage; server/cloud persistence is preserved in the code and can be re-enabled later.

**Quick Links**
- **Local page**: Open the app via `npm run dev` and visit `http://localhost:3000`.
- **Code**: Main UI is in `src/app/page.tsx`. Attendance logic is in `src/lib/attendance.ts`.

**Features**
- **Attendance rules**: 80% target calculation, safe-buffer days, half-day semantics.
- **Sandwich rule**: Holidays/weekends that are bracketed by user leaves are marked as `SANDWICH_LEAVE` and treated as penalized leave.
- **Weekend rules**: Sundays and 2nd/4th Saturdays are treated as off days by default.
- **Holidays**: Gujarat public holidays for 2026 are pre-populated in `src/lib/attendance.ts`.
- **Persistence**: Client-side LocalStorage by default, with commented cloud API and Prisma hooks kept for future use.

**How to Use**
- **Select Range**: Use the `Start Date` and `End Date` controls to set the period you want to evaluate.
- **Toggle Day Status**: Click a day in the calendar to cycle through statuses (Full Leave → Half Morning → Half Afternoon → Delete/Reset). Clicking on an `OFF`/`SANDWICH_LEAVE` day will mark it as `PRESENT` if you want to override.
- **Dashboard**: Top-right cards show Attendance Score, Safe Buffer, Total Leaves, and Working Days.

**Persistence & Re-enabling Cloud**
- Default: Browser LocalStorage via `src/lib/localStore.ts` (read/upsert/delete functions). This lets you publish the app without accounts and keep user data on their device.
- Cloud: The server API route `src/app/api/records/route.ts` and `src/lib/prisma.ts` remain in the repo. Cloud persistence is commented/kept as a fallback; to re-enable, switch API calls back in `src/app/page.tsx` and provide a production database and appropriate environment variables.

**Development**
Prerequisites: `node >= 18`, `npm`.

Install dependencies and run locally:

```bash
cd web-app
npm install
npx prisma generate   # only if you plan to use Prisma/cloud API
npm run dev
```

Build for production:

```bash
npm run build
npm run start
```

Deployment (Vercel):
- The app runs as a standard Next.js project. Since this project uses LocalStorage by default, no server DB is required for public deployment.
- If you re-enable the Prisma/cloud path, ensure `@prisma/client` is generated during build (add a `postinstall` script such as `npx prisma generate`), and set `DATABASE_URL` in Vercel environment variables.

**Notes & Gotchas**
- The app was intentionally switched to LocalStorage to avoid runtime/packaging issues with `@prisma/client` during Vercel builds. If you want global/shared persistence, integrate a hosted Postgres (Supabase is recommended) or ensure Prisma client generation runs on build.
- Holidays use the Gujarat 2026 public holiday list provided by the user. Update `src/lib/attendance.ts` if you need other years or states.

**Files of Interest**
- `src/app/page.tsx`: Main UI and interaction handlers.
- `src/lib/attendance.ts`: Core attendance computation and sandwich rule logic.
- `src/lib/localStore.ts`: Browser LocalStorage persistence implementation.
- `src/app/api/records/route.ts`: Server route (file-based or Prisma) kept for future re-enable.

**Contributing**
- Open an issue or PR for feature requests or bug fixes. If you re-enable cloud persistence, add tests around the sandwich rule and buffer calculation.

**License**
- MIT
# Leave Manager

A lightweight internship attendance planner with sandwich-leave rules and a visual calendar.

## Features
- Visual calendar to mark days as Present / Full Leave / Half Leave (morning/afternoon)
- Sandwich leave detection: weekends/holidays between leaves count as full leave
- Safe Buffer counter showing how many full-day leaves you can take before dropping below 80%
- Pre-filled Gujarat / National holidays and 2nd/4th Saturday handling
- Simple local JSON storage (dev) with a Prisma schema ready in `prisma/` (optional)

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- Prisma (SQLite) schema included; during development the app uses a JSON file store at `src/data/records.json`
- date-fns for date handling

## Quick Start
1. Install dependencies

```bash
cd web-app
npm install
```

2. Generate Prisma client (optional, only if you want to use Prisma DB instead of local JSON)

```bash
npx prisma generate
npx prisma migrate dev --name init
```

3. Run dev server

```bash
npm run dev
# open http://localhost:3000
```

## Notes
- By default the API uses a file-based store at `src/data/records.json` so you can run the app without configuring a database. To restore Prisma-backed persistence, update `src/app/api/records/route.ts` to use `src/lib/prisma.ts` and ensure `DATABASE_URL` is set in `.env`.
- If you see React hydration warnings in development caused by browser extensions (e.g., Grammarly), either disable the extension or accept the benign warning — a temporary `suppressHydrationWarning` was added to `src/app/layout.tsx` to reduce console noise.

## License
MIT
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
