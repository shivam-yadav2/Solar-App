# SolarOS Mobile

React Native (Expo) client for the **SolarOS** multi-tenant Solar EPC ERP.
Talks to the same Express + MySQL backend as the web app in `../SAAS-Solar`.

---

## Why it looks like the web app

This is a **port, not a rewrite**. Three deliberate choices keep the two
codebases close enough to maintain together:

| Concern | Web (`../SAAS-Solar`) | Mobile (here) | Shared? |
|---|---|---|---|
| Types | `src/types.ts` | `src/types.ts` | **Copied verbatim** (923 lines) |
| Styling | Tailwind CSS | **NativeWind** (same class names) | Class strings port 1:1 |
| Icons | `lucide-react` | `lucide-react-native` | Same icon set |
| Formatters | `src/lib/formatters.ts` | same, minus `exportToCSV` | Near-verbatim |
| API client | `fetch` + `localStorage` | `fetch` + **SecureStore** | Same method shapes |
| Routing | `react-router-dom` | **expo-router** (file-based) | Same URL concepts |

Because NativeWind implements Tailwind for React Native, markup like
`className="bg-white rounded-2xl border border-slate-200 p-4"` is **identical**
in both projects. Porting a screen is mostly `div`→`View`, `p`/`span`→`Text`,
`button`→`Pressable`.

---

## Running it

```bash
npm install
npm start          # Metro bundler + QR code
npm run android    # build & launch on Android emulator/device
npm run ios        # macOS only
npm run lint       # tsc --noEmit
```

### Pointing at the backend

Native apps need an absolute API URL. Set `EXPO_PUBLIC_API_URL` per environment;
if it is absent the app falls back to `expo.extra.apiBaseUrl` in `app.json`:

```jsonc
"extra": { "apiBaseUrl": "http://10.0.2.2:3000/api" }
```

| Target | Use |
|---|---|
| Android emulator | `http://10.0.2.2:3000/api` (alias for host localhost) — **default** |
| iOS simulator | `http://localhost:3000/api` |
| Physical device | `http://<your-LAN-IP>:3000/api` (e.g. `192.168.1.5`) |
| Production | `https://<your-app>.up.railway.app/api` |

The backend now enables CORS on `/api`, so Expo native and web clients can use
the same endpoints. For production builds, set
`EXPO_PUBLIC_API_URL=https://<your-app>.up.railway.app/api` in EAS.

---

## Layout

```
app/                      # expo-router: files ARE routes
├── _layout.tsx           # AuthProvider + auth gate (login vs tabs)
├── login.tsx             # /login
├── (tabs)/
    ├── _layout.tsx       # bottom tab bar (mirrors web BottomTabBar.tsx)
    ├── dashboard.tsx     # KPI cards; platform vs tenant variant
    ├── customers.tsx     # ← reference list screen, copy this shape
    ├── projects.tsx
    ├── payments.tsx
│   └── more.tsx          # role-aware overflow nav
└── (screens)/            # details, forms, tenant + platform screens

src/
├── types.ts              # copied verbatim from web
├── lib/
│   ├── api.ts            # API client (absolute base URL)
│   ├── session.ts        # SecureStore token cache + auth-expiry events
│   ├── formatters.ts     # shared display formatting
│   └── export.ts         # native CSV generation + share sheet
├── context/AuthContext.tsx
├── hooks/useFetch.ts     # load / error / pull-to-refresh
└── components/ui.tsx     # Screen, Card, StatCard, Badge, Loading, …
```

---

## Implementation status

The Android client now covers the web app's implemented backend surface:

- SUPER_ADMIN control plane: analytics, tenants, onboarding/editing, plans,
  audit, cross-tenant search, health, tenant scope, and impersonation.
- Tenant ERP: dashboard, customers, projects, payments, expenses, profit,
  payroll/employees/advances, invoices, warranties, tickets, documents,
  reports/export, audit logs, team accounts, roles, settings, leads/follow-ups,
  quotations, inventory/stock/BoQ, attendance/DPR, DISCOM, and billing.
- Customer portal: account overview, projects, payments, invoices, warranties,
  tickets/conversation, documents, feedback, and password changes.
- Create/edit flows, SecureStore auth, native document uploads, pull-to-refresh,
  loading/error/empty states, and native CSV sharing.

### Adding a screen

1. Create `app/(screens)/<name>.tsx` (reserve `(tabs)` for the five primary tabs).
2. Copy the structure of **`app/(tabs)/customers.tsx`** — it's the reference:
   `useFetch` → `Loading` / `ErrorState` / `EmptyState` → map to `<Card>`.
3. Add the matching method to `src/lib/api.ts` if it isn't there.
4. Add the route to the correct role section in `app/(tabs)/more.tsx`.

Most list screens are ~80 lines because `useFetch` and `src/components/ui.tsx`
carry the repeated parts.

---

## Notes

- CSV export uses `expo-file-system` and `expo-sharing`; no DOM APIs are used.
- Tokens live in **SecureStore** (iOS Keychain / Android Keystore), an upgrade
  over the web app's `localStorage`.
- iOS builds require macOS + Xcode, or a cloud builder (EAS / Codemagic).

## Release builds

`eas.json` includes an installable Android `preview` APK profile and a Play
Store `production` AAB profile with remote auto-incremented versions. Copy
`.env.example` for local development; store the real public API URL as
`EXPO_PUBLIC_API_URL` in the EAS `preview` and `production` environments.

Account setup and Railway deployment steps are in
[`../SAAS-Solar/DEPLOYMENT.md`](../SAAS-Solar/DEPLOYMENT.md).
