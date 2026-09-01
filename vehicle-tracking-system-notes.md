# Real-Time Vehicle Tracking System — Research Notes

## 1. Map Library Options (Free & Google Maps-like)

| Library | Notes |
|---|---|
| **Leaflet + OpenStreetMap tiles** | Free, no API key, lightweight (~40KB), huge plugin ecosystem. Good with `react-leaflet` for MERN/Next.js. Use a free-tier tile provider (MapTiler, Stadia Maps, Thunderforest) instead of OSM's own tile server for production use. |
| **MapLibre GL JS** | Open-source fork of Mapbox GL JS. Vector tiles = smoother zoom/rotation, better performance with many moving markers. Pairs with `react-map-gl`. Free tile sources: MapTiler free tier or **OpenFreeMap** (fully free, no key, no limits). |
| **Google Maps Platform** | Best polish, but not free — $200/month credit then pay-per-use. Can get expensive with frequent map loads for real-time tracking. |

**Recommendation:** MapLibre GL JS + OpenFreeMap (modern, free, no rate limits) or Leaflet + MapTiler (faster setup).

**Supporting tools:**
- Marker heading/rotation: `leaflet-rotatedmarker`, `leaflet.motion` (Leaflet); native marker rotation (MapLibre)
- Marker clustering: `leaflet.markercluster`
- Routing/ETA: OSRM (self-hosted, free) or OpenRouteService (free tier)

---

## 2. Live Tracking ≠ Map Library

Map libraries (Leaflet, MapLibre, Google Maps JS SDK) only **render** the map and markers — they don't provide "live tracking" on their own. The live/real-time part is entirely a backend architecture problem:

1. Vehicle device reads GPS coordinates
2. Coordinates sent to a backend server (Socket.io / WebSockets / MQTT)
3. Backend broadcasts new coordinates to subscribed clients
4. Frontend map library moves the marker to the new position

### Data Flow
```
Vehicle GPS device
   │  HTTP / MQTT
   ▼
Node.js + Socket.io server ──► MongoDB (location history)
   │  socket.emit
   ▼
Frontend client (socket.io-client)
   │  setLatLng() / setLngLat()
   ▼
Leaflet / MapLibre map — marker moves, icon rotates
```

### Implementation notes
- Use **Socket.io rooms per vehicle/fleet** (`socket.join('vehicle-123')`) so clients only receive relevant updates
- Throttle GPS pings to ~1–2 seconds — too frequent floods the socket and map redraw
- **Interpolate marker movement** (`requestAnimationFrame`) between old/new points instead of snapping, for smooth animation
- Buffer/queue GPS pings on the device during dead zones/tunnels, flush on reconnect

### Where Leaflet/MapLibre match Google Maps
- Smooth marker movement, marker rotation for heading, multiple simultaneous vehicles, clustering — all fully supported

### Where Google Maps has an edge
- Proprietary traffic-aware routing/ETA (hard to replicate free)
- Slightly richer global road/POI data in some regions vs. OSM

---

## 3. Sending Location Data — Options

### Option 1: Mobile app using device GPS (React Native / Flutter)
- React Native: `expo-location` or `react-native-geolocation-service`, using `watchPosition()`
- Flutter: `geolocator` package
- Stream of `{ latitude, longitude, speed, heading, timestamp }` sent to backend via Socket.io/WebSocket

### Option 2: Dedicated GPS hardware tracker
- SIM-enabled module (Teltonika, Concox, Queclink) wired into vehicle
- Sends data via raw TCP/UDP (manufacturer-specific binary protocol) or HTTP/MQTT
- Works independent of any driver phone; better for fleet/logistics use cases
- Backend: Node.js `net` module TCP/UDP listener, or MQTT broker (Mosquitto/EMQX)

**Guidance:** driver-app model (React Native/Flutter) → cheaper, simpler, good for Uber/Zomato-style apps. Company-owned fleet → hardware GPS tracker is more reliable (no dependency on phone/app being open).

---

## 4. PWA-Specific Approach (Sandeep's actual stack — no React Native/Flutter)

### Getting location — Geolocation Web API
```javascript
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude, speed, heading } = position.coords;
    socket.emit('location-update', {
      vehicleId: 'V123',
      lat: latitude,
      lng: longitude,
      speed,
      heading,
      timestamp: Date.now(),
    });
  },
  (error) => console.error('GPS error:', error),
  { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
);

// Stop tracking
navigator.geolocation.clearWatch(watchId);
```

### PWA background tracking limitations
| Platform | Behavior when backgrounded/locked |
|---|---|
| Android Chrome (installed PWA) | Keeps working for a while but throttled more aggressively than a native app — not fully reliable for long hauls |
| iOS Safari (PWA) | Very strict — geolocation and JS execution stop almost immediately on screen lock/background. Biggest limitation |
| Desktop | Not relevant for vehicle use case |

### Mitigations
1. **Wake Lock API** — keep screen awake during active tracking (`navigator.wakeLock.request('screen')`). Helps a lot on Android; iOS still restrictive even with wake lock.
2. **Buffer + batch on reconnect** — queue GPS points in IndexedDB during gaps, flush when foreground/connection resumes.
3. **Set driver expectations** — realistic PWA pattern is "keep app open, screen on while driving" (like Google Maps navigation). True bulletproof background tracking (screen off, app closed) needs a native app or dedicated hardware GPS module.

Backend and frontend map logic stay identical regardless of source (PWA, native app, or hardware tracker) — the server/Socket.io/Leaflet layer doesn't care where the ping originated.

---

## 5. Converting PWA to Native (e.g. via Nativine or similar wrappers)

### What these wrappers actually do
Nativine, Capacitor, Median, GoNative etc. compile the PWA into a real Android/iOS binary, but the web app still renders inside a **WebView**. The benefit is access to **native SDK plugins** that bridge JS calls to real OS APIs — not that the JS itself becomes native.

### Why this matters for the background GPS problem
If the wrapped app still uses the plain `navigator.geolocation.watchPosition()` API inside the WebView, it hits nearly the **same throttling** as a browser tab — WebViews get suspended in the background too.

### What actually fixes it
Switching to a **native background location plugin** exposed by the wrapper's JS-to-native bridge — one that starts a true OS-level location service:
- **Android:** Foreground service with persistent notification (required Android 10+), `ACCESS_BACKGROUND_LOCATION` permission
- **iOS:** "Always" location permission (not "While Using"), `UIBackgroundModes: location` in Info.plist — reviewed carefully by Apple during App Store submission

Reference plugin (Capacitor ecosystem, for comparison): `@capacitor-community/background-geolocation`.

**Action item:** confirm whether Nativine specifically ships a background-location plugin (foreground service / background mode), not just standard device GPS access — otherwise the same throttling issue persists even after converting to native.

---

## Open Next Steps (not yet built)
- Socket.io backend code (GPS ingestion + broadcast)
- React/Leaflet marker-update component with smooth interpolation
- Wake Lock + IndexedDB buffering logic for the PWA
