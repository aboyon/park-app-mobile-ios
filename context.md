# Park App — Project Context

## Overview

A parking management platform consisting of:
- **Rails 8.1+ API** — backend deployed on Heroku
- **park-app-mobile** — driver-facing iOS app (React Native / Expo)
- **parkapp-operator** — operator-facing iOS app (React Native / Expo)

---

## Tech Stack

### Backend
- Ruby on Rails 8.1+
- PostgreSQL with PostGIS (geospatial queries)
- Sidekiq + Redis (background jobs)
- JWT authentication
- CanCanCan (authorization)
- ActiveModel::Serializers
- Deployed on Heroku: `https://app.parke.ar`

### Mobile (both apps)
- React Native with Expo (Expo Router, file-based routing)
- TypeScript
- expo-location (GPS tracking)
- expo-notifications (push notifications)
- react-native-qrcode-svg (QR generation — driver app)
- expo-camera (QR scanning — operator app)
- @react-navigation/bottom-tabs (tab navigation)

---

## API

### Base URL
```
https://app.parke.ar
```

### Required Headers
```
Content-Type: application/json
x-park-app-api-version: application/vnd.parkapp.v1+json
Authorization: Bearer <token>
```

### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Authenticate user, returns JWT token |
| GET | `/api/me` | Returns current user profile (name, email) |
| GET | `/api/near-to-me?latitude=X&longitude=Y&radius=Z` | Returns nearby parkings |
| POST | `/api/parking_reservations` | Create a reservation |
| PATCH | `/api/app-notification-token` | Update push notification token |

### Auth Request
```json
POST /api/auth
{ "email": "xxx", "password": "xxx" }
```

### Nearby Parkings
```
GET /api/near-to-me?latitude=-32.899&longitude=-60.873&radius=474
```
Returns array of parkings with: `id`, `name`, `address`, `latitude`, `longitude`, `distance`

### Create Reservation
```json
POST /api/parking_reservations
{ "reservation": { "parking_id": "<uuid>" } }
```

### Parking response

#### Without active subscription
```json
{
   "active_subscription" : {},
   "address" : "1234 Drive, Springfield, MA",
   "available" : true,
   "available_slots" : 0,
   "distance" : 0,
   "id" : "7a45c6ee-28d3-11f1-a973-a353f41b6879",
   "keep_slot_open_minutes" : 15,
   "latitude" : -32.8959,
   "lock_slot_charge_policy" : "first_hour_rate",
   "lock_slot_charge_policy_number" : "1.0",
   "lock_slot_charge_policy_number_cents" : 100,
   "longitude" : -60.87319,
   "name" : "Parking downtown",
   "openings" : [
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "23:59",
         "open_at" : "00:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "23:58",
         "open_at" : "00:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      }
   ],
   "operator_max_distance_meters" : 30,
   "parking_method" : "both",
   "parking_rates" : [
      {
         "day_of_week" : 4,
         "day_of_week_name" : "Thursday",
         "rate_per_hour" : "1000.0",
         "rate_per_hour_cents" : 100000,
         "vehicle_type" : "car"
      },
      {
         "day_of_week" : 2,
         "day_of_week_name" : "Tuesday",
         "rate_per_hour" : "1000.0",
         "rate_per_hour_cents" : 100000,
         "vehicle_type" : "car"
      },
      {
         "day_of_week" : 2,
         "day_of_week_name" : "Tuesday",
         "rate_per_hour" : "1500.0",
         "rate_per_hour_cents" : 150000,
         "vehicle_type" : "suv"
      },
      {
         "day_of_week" : 2,
         "day_of_week_name" : "Tuesday",
         "rate_per_hour" : "2000.0",
         "rate_per_hour_cents" : 200000,
         "vehicle_type" : "pickup"
      }
   ],
   "phone" : null,
   "rate_policy_strategy" : "flexible",
   "today_penalization_rates_cents" : {},
   "today_rate_cents" : {
      "car" : {
         "rate_per_hour" : 1000,
         "rate_per_hour_cents" : 100000,
         "wday" : 2
      },
      "pickup" : {
         "rate_per_hour" : 2000,
         "rate_per_hour_cents" : 200000,
         "wday" : 2
      },
      "suv" : {
         "rate_per_hour" : 1500,
         "rate_per_hour_cents" : 150000,
         "wday" : 2
      }
   }
}
```

#### With active reservation
```json
{
   "active_subscription" : {
      "id" : "fbd68df0-fed4-4a20-b74c-8e40c96c363d",
      "started_at" : "2026-03-31T00:00:00.000Z",
      "status" : "active"
   },
   "address" : "1234 Drive, Springfield, MA",
   "available" : true,
   "available_slots" : 0,
   "distance" : 0,
   "id" : "7a45c6ee-28d3-11f1-a973-a353f41b6879",
   "keep_slot_open_minutes" : 15,
   "latitude" : -32.8959,
   "lock_slot_charge_policy" : "first_hour_rate",
   "lock_slot_charge_policy_number" : "1.0",
   "lock_slot_charge_policy_number_cents" : 100,
   "longitude" : -60.87319,
   "name" : "Parking downtown",
   "openings" : [
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "23:59",
         "open_at" : "00:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "23:58",
         "open_at" : "00:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      },
      {
         "close_at" : "21:00",
         "open_at" : "08:00"
      }
   ],
   "operator_max_distance_meters" : 30,
   "parking_method" : "both",
   "parking_rates" : [
      {
         "day_of_week" : 4,
         "day_of_week_name" : "Thursday",
         "rate_per_hour" : "1000.0",
         "rate_per_hour_cents" : 100000,
         "vehicle_type" : "car"
      },
      {
         "day_of_week" : 2,
         "day_of_week_name" : "Tuesday",
         "rate_per_hour" : "1000.0",
         "rate_per_hour_cents" : 100000,
         "vehicle_type" : "car"
      },
      {
         "day_of_week" : 2,
         "day_of_week_name" : "Tuesday",
         "rate_per_hour" : "1500.0",
         "rate_per_hour_cents" : 150000,
         "vehicle_type" : "suv"
      },
      {
         "day_of_week" : 2,
         "day_of_week_name" : "Tuesday",
         "rate_per_hour" : "2000.0",
         "rate_per_hour_cents" : 200000,
         "vehicle_type" : "pickup"
      }
   ],
   "phone" : null,
   "rate_policy_strategy" : "flexible",
   "today_penalization_rates_cents" : {},
   "today_rate_cents" : {
      "car" : {
         "rate_per_hour" : 1000,
         "rate_per_hour_cents" : 100000,
         "wday" : 2
      },
      "pickup" : {
         "rate_per_hour" : 2000,
         "rate_per_hour_cents" : 200000,
         "wday" : 2
      },
      "suv" : {
         "rate_per_hour" : 1500,
         "rate_per_hour_cents" : 150000,
         "wday" : 2
      }
   }
}
```

---

## Driver App (park-app-mobile)

### Key Features
- Login screen with JWT authentication
- GPS speed detection (driving detected when speed > 20 km/h)
- Nearby parkings list with cards
- Parking detail screen with distance in km
- Active reservation screen with QR code (encodes reservation ID)
- Push notification handler
- Bottom tab navigation (Parkings / Profile)
- User profile screen with logout

### File Structure
```
app/
  (tabs)/
    _layout.tsx          ← bottom tab navigator
    index.tsx            ← entry point, handles auth state
    home-tab.tsx         ← GPS tracking + parking list
    login.tsx            ← login screen
    parking-detail.tsx   ← parking detail + Apple Maps link
    profile.tsx          ← user profile + logout
constants/
  config.js              ← API_BASE_URL, PARKAPP_API_VERSION
```

### Environment Variables
```bash
# .env.local (local development)
EXPO_PUBLIC_API_URL=http://192.168.1.XX

# .env (production)
EXPO_PUBLIC_API_URL=https://app.parke.ar
```

### Constants (constants/config.js)
```javascript
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://app.parke.ar';
export const PARKAPP_API_VERSION = 'application/vnd.parkapp.v1+json';
```

### GPS Tracking Logic
```typescript
// Speed threshold for driving detection
if (speedKmh > 20) {
  fetchNearbyParkings(latitude, longitude);
}
```

### Push Notification Handler
```typescript
const handleIncomingNotification = (notification) => {
  const { type, triggered_by } = notification.request.content.data;
  
  if (type === 'reservation_cancelled' || type === 'reservation_expired') {
    // show alert, refresh
  } else if (type === 'notify_payment_completed' || type === 'reservation_completed') {
    // show "thanks for parking" screen, refresh
  }
};
```

### Push Token Registration
```typescript
const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
  projectId: 'YOUR_PROJECT_ID', // from eas project:info
});
await fetch(`${API_BASE}/api/app-notification-token`, {
  method: 'PATCH',
  headers: apiHeaders(token),
  body: JSON.stringify({ app_notification_token: pushToken }),
});
```

### QR Code (Active Reservation Screen)
```typescript
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={reservation.id.toString()}
  size={200}
  color="#000"
  backgroundColor="#fff"
/>
```

---

## Operator App (parkapp-operator)

### Key Features
- Login screen (same as driver app)
- QR scanner (reads reservation ID from driver app QR)
- Triggers check in / check out / view reservation details
- Bottom tab navigation (Scanner / Profile)

### File Structure
```
app/
  (tabs)/
    _layout.tsx          ← bottom tab navigator
    index.tsx            ← entry point, handles auth state
    scanner-tab.tsx      ← QR scanner
    login.tsx            ← login screen
    profile.tsx          ← user profile + logout
```

### QR Scanner
```typescript
import { CameraView } from 'expo-camera';

<CameraView
  onBarcodeScanned={({ data }) => {
    // data = reservation.id
    // call check in / check out API
  }}
  barcodeScannerSettings={{
    barcodeTypes: ['qr'],
  }}
/>
```

---

## Development Workflow

### Running Both Apps Simultaneously
```bash
# Terminal 1 — driver app in iOS simulator
cd park-app-mobile
npx expo start --clear
# Press 'i' to open iOS simulator

# Terminal 2 — operator app in Expo Go on real iPhone
cd parkapp-operator
npx expo start --clear
# Press 's' to switch to Expo Go mode
# Press 'c' to show QR
# Scan with Expo Go app on iPhone
```

### Building for iPhone (without App Store)
```bash
# 1. Generate native iOS project
npx expo prebuild --platform ios --clean

# 2. Open in Xcode
open ios/parkappoperator.xcworkspace

# 3. In Xcode: Product → Scheme → Edit Scheme → Run → Release
# 4. Select iPhone as target, hit Play ▶️
```

**Important:** Delete `.env.local` before building in Xcode to ensure production URL is used.

### Trusted Developer (first time)
Settings → General → VPN & Device Management → Trust

---

## Infrastructure & Services

### Apple Developer Account
- Cost: $99/year
- Required for: push notifications, App Store, EAS Build, CarPlay entitlement
- Status: enrollment submitted

### EAS Build
- Expo's cloud build service
- Alternative to local Xcode builds
- Required for standalone push notification testing
- Commands:
```bash
eas init
eas build:configure
eas build --platform ios --profile development
```

### Push Notifications
- Provider: **Expo Notifications** (free up to 1M/month)
- Token format: `ExponentPushToken[XXXX]`
- Stored in Rails: `app_notification_token` column
- Silent push payload triggers internal app actions

### Error Reporting
- **Sentry** (recommended — free tier: 5,000 unique errors/month)
```bash
npx expo install @sentry/react-native
```
```typescript
import * as Sentry from '@sentry/react-native';
Sentry.init({ dsn: 'your-dsn-here' });
```

### Logging & Telemetry
- **Better Stack** — for logs (simple Rails integration, clean UI)
- **Grafana Cloud** — for full telemetry (logs + metrics + traces)

---

## App Icons

- Source: Icon Kitchen (icon.kitchen)
- Required file: `AppIcon~ios-marketing.png` (1024x1024px, no transparency)
- Place at: `assets/images/icon.png`
- Referenced in `app.json`:
```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "ios": {
      "icon": "./assets/images/icon.png"
    }
  }
}
```

---

## CarPlay (Future Phase)

- App category: **Parking** (approved CarPlay category)
- Requires entitlement request at developer.apple.com/carplay (free)
- CarPlay UI must be built in native **Swift** alongside React Native
- Apply for entitlement early as approval takes time

---

## Competitive Landscape (Argentina/LATAM)

- **Blinkay** — Buenos Aires, digital parking management
- **ParkFacil** — Chile, license plate reader cameras
- **International:** Parkopedia, Passport Labs, Flowbird, INRIX, Arrive

**Differentiator:** Proactive driving detection (speed-based) that automatically surfaces nearby parkings — not offered by local competitors.

---
### Color Scheme

The application should follow this color guidelines when mode is dark. When mode is light, replace with colors that can be distinguished easily.

 Token       | Value                    |
|-------------|--------------------------|
| Background  | `#0a0a0f`                |
| Surface     | `#0d0d1a`                |
| Surface2    | `#0f0f1e`                |
| Surface3    | `#111120`                |
| Cyan        | `#00d4ff`                |
| Amber       | `#f5a623`                |
| Text        | `#eeeeff`                |
| Muted       | `rgba(238,238,255,0.45)` |
| Border      | `rgba(255,255,255,0.07)` |

**Key overrides:**
- All `bg-indigo-*` → cyan gradient or rgba tint
- All `text-indigo-*` → `#00d4ff`
- All `bg-white` inside `main` → `#0f0f1e`
- Gray text scale mapped to `rgba(238,238,255, α)` with decreasing alpha
- Flash notice: cyan-tinted; Flash alert: red-tinted

### Fonts
- Logo/headings: **Syne** (700, 800) — loaded from Google Fonts
- Body: **Outfit** (300, 400, 500, 600) — loaded from Google Fonts


---

## Pending Tasks

- [ ] Apple Developer account approval
- [ ] EAS Build setup for both apps
- [ ] Replace `projectId: 'xxxxxxxx'` with real Expo project ID (`eas project:info`)
- [ ] Fix typo in endpoint: `/api/app-notfication-token` → `/api/app-notification-token`
- [ ] Sentry integration (both apps)
- [ ] Better Stack / Grafana Cloud setup (Rails backend)
- [ ] CarPlay entitlement request
- [ ] Operator app QR scanner completion
- [ ] Test full QR flow end to end (driver generates → operator scans → API triggered)