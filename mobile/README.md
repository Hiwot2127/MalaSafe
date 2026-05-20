# MalaSafe Mobile

React Native (Expo) public-awareness app for the MalaSafe malaria
surveillance system. Talks to the same `/api/v1` backend as the web
dashboard. Aimed at the general public — district-level risk lookup,
outbreak alerts, prevention guidance, and travel risk assessment.

## Tech Stack

- **Expo** + **React Native** (file-based routing via `expo-router`)
- **TypeScript**
- Backend: hits `${BASE_URL}/api/v1` over HTTPS (JWT bearer)

## Prerequisites

- Node.js 18+
- Expo Go on a physical device, or an Android emulator / iOS simulator
- MalaSafe backend reachable from the device — for a physical device, that
  means the host machine's LAN IP, not `localhost`

## Setup

```bash
cd mobile
npm install
```

### Point the app at the backend

Edit `services/api.js` and set `BASE_URL`:

```javascript
// Local backend, simulator/emulator on the same machine:
const BASE_URL = 'http://localhost:8000/api/v1';

// Physical device on the same Wi-Fi — use the host machine's LAN IP:
// const BASE_URL = 'http://192.168.1.x:8000/api/v1';

// Production:
// const BASE_URL = 'https://malasafe-api.onrender.com/api/v1';
```

### Run

```bash
npx expo start
```

- **Android device:** scan the QR code with Expo Go (or press `a` in the
  terminal for an emulator).
- **iOS device:** scan the QR code with the Camera app (or press `i` for
  the iOS Simulator).
- **Web preview:** press `w` (limited — uses `expo-router`'s web target).

## App structure

```
mobile/
├── app/
│   ├── (auth)/              # login + register (pre-auth flow)
│   │   ├── index.tsx        # login
│   │   └── register.tsx     # public self-registration
│   ├── (tabs)/              # main tab bar (post-auth)
│   │   ├── index.tsx        # home — current-district risk + summary
│   │   ├── alerts.tsx       # active outbreak alerts
│   │   ├── map.tsx          # risk heatmap (leaflet-equivalent)
│   │   └── travel.tsx       # travel risk assessment
│   ├── modal.tsx            # generic modal sheet
│   └── prevention.tsx       # prevention guidance content
├── components/
├── services/api.js          # axios client + BASE_URL
├── context/                 # auth + user state
├── hooks/
├── constants/
└── assets/
```

The six surfaces called out in the root README map to:
**login**, **register**, **home/risk**, **alerts**, **map**, **travel**
(`prevention.tsx` and `modal.tsx` are sub-screens, not top-level tabs).

## Backend endpoints used

- `POST /api/v1/mobile/register` — public self-registration
- `POST /api/v1/auth/login` — issues JWT
- Risk dashboard / map / alerts endpoints under `/api/v1` — see
  [../backend/API_REFERENCE.md](../backend/API_REFERENCE.md)

Auth: JWT bearer token stored on-device (via `expo-secure-store`-style
storage in `context/`); attached to every request by `services/api.js`.

## Common gotchas

- **`Network request failed` on a physical device** — `BASE_URL` is set to
  `localhost`; switch to the host machine's LAN IP and confirm the backend
  is reachable from the phone's browser.
- **401 on every call after first login** — token storage cleared or the
  backend `SECRET_KEY` rotated; log out and log back in.
- **Empty risk data** — the backend needs the seed + backfill steps from
  [../QUICKSTART_FULL_STACK.md](../QUICKSTART_FULL_STACK.md) (Step 5)
  before any predictions exist.

## Related docs

- Root project: [../README.md](../README.md)
- Full-stack setup: [../QUICKSTART_FULL_STACK.md](../QUICKSTART_FULL_STACK.md)
- Backend API reference: [../backend/API_REFERENCE.md](../backend/API_REFERENCE.md)
- AI / prediction pipeline: [../AI_INTEGRATION_NOTES.md](../AI_INTEGRATION_NOTES.md)

## Learn more about Expo

- [Expo documentation](https://docs.expo.dev/)
- [expo-router](https://docs.expo.dev/router/introduction/)
- [Expo Go](https://expo.dev/go)
