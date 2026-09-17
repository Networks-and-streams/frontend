# Graph Resolver — Frontend

Frontend for the Graph Resolver product: an authenticated, subscription-gated
graph algorithm workspace (shortest paths with the Minty algorithm, max flow
with Ford–Fulkerson, and step-by-step execution traces once the compute service
is connected).

> This frontend was rebuilt from scratch around the actual backend API in
> `../backend`. It contains no remnants of the previous Ascora/fitness app.

## Stack

- React 19 + TypeScript (strict) + Vite 7 + Tailwind CSS 4
- react-router-dom 7 (route guards, no nesting tricks)
- zustand (auth + subscription stores only)
- axios (single shared HTTP client with refresh handling in `shared/api/http.ts`)

## Product flow

```
Open app
  ├─ not authenticated → /auth (register / login / Google OAuth)
  └─ authenticated
       ├─ active subscription → /graph (the application)
       └─ no active subscription → /subscribe (payment) → /graph
```

Access control is decided by the **backend** on every navigation:

| State (backend)                           | Result                          |
| ----------------------------------------- | ------------------------------- |
| session unknown (restoring)               | full-screen loading state       |
| no valid session                          | `/auth`                         |
| session valid, subscription inactive      | `/subscribe`                    |
| session valid, subscription ACTIVE        | `/graph`                        |

The guards map the combinations of
`(auth ready, authenticated, subscription ready, subscription active)` to those
destinations — see `src/app/guards/`. Subscription state is re-fetched from
`GET /subscriptions/me` whenever a session exists, so browser refreshes and
direct navigation resolve correctly and nothing is ever trusted from
localStorage.

## Backend API integration

All contracts are DTO-aligned with `../backend` (NestJS):

| Endpoint                              | Used for                                        |
| ------------------------------------- | ----------------------------------------------- |
| `POST /auth/register`                 | registration (returns access token + refresh cookie) |
| `POST /auth/login`                    | sign-in (returns access token + refresh cookie) |
| `POST /auth/refresh`                  | silent session restoration (HttpOnly cookie)    |
| `POST /auth/logout`                   | sign-out (revokes the refresh session)          |
| `POST /auth/logout-all-devices`       | sign-out everywhere                             |
| `GET /auth/status`                    | current user (`id`, `email`)                    |
| `GET /subscriptions/me`               | authoritative subscription state                |
| `POST /payments`                      | create a PENDING payment (plan + payment method)|
| `GET /payments/:id`                   | payment state (polling/verification)            |
| `POST /payments/:id/google-pay`       | submit the Google Pay token                     |
| `GET /oauth/google` + `/auth/callback`| Google OAuth flow                               |

### Authentication model

- The **access token lives only in memory** (no localStorage).
- The **refresh token is an HttpOnly cookie** set by the backend (`withCredentials: true`).
- On a 401 the HTTP client silently calls `POST /auth/refresh`, retries the
  request once, and clears the session if the refresh fails.
- OAuth redirects back to `/auth/callback`, which exchanges the cookie for an
  access token and let the guards route the user.

### Subscription / payment model

1. The user lands on `/subscribe` (authenticated, no ACTIVE subscription).
2. The page shows the Premium plan (`$9.99` / 30 days, mirrored from backend
   `PLAN_PRICING`) and a native Google Pay button.
3. Clicking it runs the authoritative sequence:

   ```
   POST /payments                     → PENDING payment
   POST /payments/:id/google-pay      → PROCESSING / SUCCEEDED / FAILED
   poll GET /payments/:id             → until terminal (webhook as source of truth)
   GET /subscriptions/me              → verify ACTIVE before unlocking /graph
   ```

   The UI never treats a clicked button as success; it waits for the backend
   payment record and only then re-checks the subscription.

4. Payment states (`PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`,
   `CANCELLED`, `REFUNDED`) map to explicit UI states: idle, creating,
   submitting, processing, succeeded, failed, cancelled.

Google Pay specifics live in `src/features/subscription/lib/googlePay.ts`
(SDK loader, request builders, Stripe-gateway tokenization spec) and the
rendering in `GooglePayButton.tsx`, so swapping providers stays local.

### Compute service (graph solving)

The compute service is **not implemented yet** (`../compute` is a design
document only; the `.proto` contract is still to be agreed). The frontend
boundary in `src/features/graph/api/graph.api.ts` is a real integration point
that intentionally throws until a backend endpoint exists — nothing faked.

## Environment

Copy `.env.example` to `.env` and adjust:

| Variable                     | Default               | Purpose                                   |
| ---------------------------- | --------------------- | ----------------------------------------- |
| `VITE_API_URL`               | `http://localhost:3000`| Backend base URL (must be in backend `CORS_ORIGINS`) |
| `VITE_GOOGLE_PAY_ENV`        | `TEST`                | Google Pay environment (`TEST` / `PRODUCTION`) |
| `VITE_GOOGLE_PAY_MERCHANT_ID`| —                     | Merchant ID (required only in `PRODUCTION`) |

CORS/cookies: the backend is configured with `credentials: true` and specific
origins; keep the dev origin (`http://localhost:5173`) on the backend list.

## Scripts

```bash
npm run dev      # Vite dev server (default port 5173)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # preview the production build
```

## Structure

```
src/
├── app/                 # router (App.tsx), shell, route guards
│   ├── components/      # AppShell (header), FullScreenLoader
│   └── guards/          # access-map + PublicOnly / Require* / RootRedirect
├── features/
│   ├── auth/            # api, store, pages, AuthForm, DTO types
│   ├── subscription/    # api, store, Google Pay, SubscribePage, DTO types
│   └── graph/           # api boundary, canvas, input panel, GraphPage, types
├── shared/
│   ├── api/http.ts      # axios client + access-token + refresh handling
│   ├── components/ui/   # Button, StateBlock, ToastViewport
│   ├── icons/           # SVG icon set
│   ├── store/toastStore.ts
│   └── utils/           # formatting helpers
├── main.tsx
└── index.css
```