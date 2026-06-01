# Douda Salon — Managing App (Context Document)

A cross-platform (iOS + Android) beauty salon management app built with **Expo 54** + **React Native** + **TypeScript** + **expo-router**.

## Architecture

### Tech Stack
- **Framework**: Expo 54 with expo-router (file-based routing)
- **Language**: TypeScript
- **Storage**: AsyncStorage (local, on-device)
- **Notifications**: expo-notifications (15-min appointment reminders)
- **Navigation**: Stack (root), Tabs (admin), Stack (employee)

### Data Version Migration
- `douda.dataVersion` key in AsyncStorage tracks schema version
- Current version: **2** — bumping this forces re-seed of categories + services
- Employee data and logs are preserved across migrations

## Project Structure

```
app/
  _layout.tsx              # Root stack, seeds data on startup
  index.tsx                # Entry → redirects to /login or saved session
  login.tsx                # PIN-based auth (employee or owner mode)
  employee/
    _layout.tsx            # Stack layout with sign-out
    index.tsx              # "Log a client" form (category → service → amount → color/notes → time)
    my-day.tsx             # Today's entries for the logged-in employee
  admin/
    _layout.tsx            # Bottom tab layout (Home, Calendar, Services, Team, Settings)
    index.tsx              # Dashboard: today KPIs, 7-day & 30-day analytics, charts
    calendar.tsx           # Google Calendar-style timeline with overlap handling
    services.tsx           # Manage categories + services (SectionList)
    employees.tsx          # Add/remove employees, set PINs
    settings.tsx           # Change owner PIN
src/
  components/UI.tsx        # Design-system: Screen, Card, H1-H3, Body, Field, Button, Row, Pill
  theme/index.ts           # Warm blush + plum palette, spacing, typography, shadows
  store/store.ts           # AsyncStorage CRUD for all entities + seeding
  store/storage.ts         # AsyncStorage wrapper
  store/summary.ts         # Daily summary calculations (income, minutes, breakdowns)
  types/index.ts           # TypeScript interfaces
```

## Data Models

### ServiceCategory
```ts
{ id, name, isNailRelated: boolean }
```
- `isNailRelated: true` → shows "Color code" input in employee form
- Categories: Gel Nails, Manicure, Pedicure, Manicure & Pedicure, Tattoo Services, Tattoo Removal, Wax Services, Other

### Service
```ts
{ id, name, price, categoryId }
```
- 36 services pre-seeded from Douda's actual price lists
- "Other" category has a single "Other service" entry (price 0)

### WorkLog
```ts
{ id, employeeId, employeeName, clientName, serviceId, serviceName,
  servicePrice, amountPaid, colorCode?, notes?, categoryId, categoryName,
  startISO, endISO, createdAtISO }
```
- `amountPaid` is what was actually charged (separate from listed price)
- `colorCode` only for nail-related categories
- `notes` only for "Other" category

### Appointment
```ts
{ id, clientName, employeeId, employeeName, serviceId, serviceName,
  categoryId, categoryName, dateISO, timeISO, notes?, notified? }
```
- Created from admin Calendar tab
- Triggers a local notification 15 minutes before

### Employee
```ts
{ id, name, pin }
```

### Session
```ts
{ role: 'admin' | 'employee', employeeId?, employeeName? }
```

## Key Features

### Employee Flow
1. Sign in with PIN
2. Log client: name → pick category → pick service (no price shown) → enter amount paid → color code (nail only) / notes (Other only) → start/end time
3. View "My day" summary

### Admin Dashboard (Home tab)
- Today: income, service count, hours worked, active staff
- Service breakdown + per-employee breakdown
- 7-day: total income, total services, avg/day, bar chart, top 5 services, revenue by category, top employees
- 30-day: same metrics

### Calendar
- Google Calendar-style weekly view with AM/PM hour labels (7 AM – 8 PM)
- Week navigation (‹ ›), tap month to jump to today
- Day chips with dot indicators for days with appointments
- Timeline with hourly grid, red current-time indicator
- **Overlap handling**: concurrent appointments lay out side-by-side in columns
- Appointment blocks color-coded by employee
- Long-press to cancel, + button for new appointment form
- Appointment list summary below timeline

### Services Management
- Add/remove categories (with nail-related toggle for color filter)
- Add/remove services within categories
- SectionList grouped by category

### Notifications
- expo-notifications schedules a local alert 15 min before each appointment
- Notification shows: client name, employee name, service, category

## Default Credentials
- **Owner PIN**: `1234`
- **Sample Employee PIN**: `0000`

## Theme
```ts
colors: {
  bg: '#FFF7F3', card: '#FFFFFF', text: '#2A1A22', textMuted: '#7A6670',
  border: '#F0DDD3', primary: '#B5476B', primaryDark: '#8E2F50',
  accent: '#E8B4BC', success: '#3FA67E', danger: '#C0463F'
}
```

## Running
```bash
npm install
npx expo start          # scan QR with Expo Go
npx expo start --web    # browser preview
```

## Future Plans
- Per-employee category access control (restrict which categories each employee can see)
- Cloud sync (Supabase/Firebase)
- CSV export for accounting
- EAS Build for App Store / Play Store
