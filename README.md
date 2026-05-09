# Douda Salon — Managing App

A cross-platform (iOS + Android) app for a beauty salon, built with **Expo** + **React Native** + **TypeScript** and **expo-router**.

## What it does

- **Two roles**
  - **Owner (admin)** — single account, PIN-protected. Sees daily summaries.
  - **Employees** — each has their own PIN. They log work entries.
- **Employees log**: client name, start time, end time, service performed.
- **Owner dashboard (today)**:
  - Total income today
  - Total services performed today (with breakdown per service type)
  - Total hours worked
  - Per-employee breakdown: hours, earnings, individual services performed
- **Owner can manage**:
  - Employees (add / remove, set PIN)
  - Service menu (add / remove, name + price)
  - Owner PIN

Data is stored locally on the device using `AsyncStorage`. (See "Going further" below to add a real backend.)

## Default credentials

- Owner PIN: **`1234`** (change immediately from Owner ▸ Settings)
- A sample employee with PIN `0000` is seeded so you can try the flow. Delete it from Owner ▸ Employees.

## Run it

```bash
cd /Users/kablo/Douda_managing_app
npm install            # if you haven't already
npx expo start         # then press i (iOS sim), a (Android), or scan QR with Expo Go
```

To get the app on a physical iPhone or Android phone today, install **Expo Go** from the App Store / Play Store and scan the QR code printed by `expo start`.

## Project structure

```
app/                     # expo-router file-based routes
  _layout.tsx            # root stack, seeds default data
  index.tsx              # entry → routes to /login, /employee, or /admin
  login.tsx              # employee or owner sign-in
  employee/
    _layout.tsx
    index.tsx            # "Log a client" form
    my-day.tsx           # employee's own entries today
  admin/
    _layout.tsx
    index.tsx            # daily dashboard
    employees.tsx        # manage team
    services.tsx         # manage service menu
    settings.tsx         # change owner PIN
src/
  components/UI.tsx      # design-system primitives (Card, Button, Field, …)
  theme/index.ts         # colors, spacing, typography
  store/store.ts         # AsyncStorage-backed data layer
  store/summary.ts       # daily-summary calculations
  types/index.ts         # shared TypeScript types
```

## Adding the real services

Once you give me the official list of services and prices, either:
1. I'll bake them into `src/store/store.ts` (`DEFAULT_SERVICES`), **or**
2. The owner adds them in-app from **Owner ▸ Services**.

## Going further (optional next steps)

- **Cloud sync** so owner can see logs from any device: add Supabase or Firebase (replace `src/store/store.ts` calls with API calls).
- **Date range** on the admin dashboard (week / month) — `summarizeDay` is already structured to be generalised.
- **Export to CSV** for accounting.
- **Build & deploy**:
  - For App Store / Play Store: `npx eas build` (EAS Build, free tier available).
  - For the cloud build service you mentioned (`vibecode-cli`): you'll need a `VIBECODE_API_KEY` from https://vibecode.dev/key, then `vibecode-cli` can deploy this same Expo project.

## Notes about the tools you mentioned

- **`vibecode-cli`** is a hosted build/deploy CLI — it requires a `VIBECODE_API_KEY`. Once you have one, run `export VIBECODE_API_KEY=...` and we can wire up the deploy step.
- **`npx skills add ... expo-app-design`** is a skill-installer for AI assistants (Claude/Codex). It installs design guidance into the assistant's config; the actual app code is what you see here. The design system in `src/theme` and `src/components/UI.tsx` follows that skill's principles (consistent palette, generous spacing, soft cards, large touch targets, system fonts).
