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
