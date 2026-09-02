/**
 * Seed a tiny network + walk a vehicle along its route posting GPS fixes.
 *
 *   node scripts/sim-gps.mjs
 *
 * Env (all optional):
 *   API   base url          default http://localhost:5000/api/v1
 *   EMAIL admin login       default $ADMIN_EMAIL or admin@transit.test
 *   PASS  admin password    default $ADMIN_PASSWORD or AdminPass123!
 *   STEP  seconds per fix   default 4
 *   SPEED metres per step   default 60   (~54 km/h; keep under ~110 km/h)
 *
 * Uses only the admin API. The ADMIN role bypasses the GPS driver-ownership
 * check and, with no deviceId, the device-binding check — so no phone needed.
 * Requires the backend to be up AND Redis working for the fixes to fan out.
 */

const API = process.env.API || "http://localhost:5000/api/v1";
const EMAIL = process.env.EMAIL || process.env.ADMIN_EMAIL || "admin@transit.test";
const PASS = process.env.PASS || process.env.ADMIN_PASSWORD || "AdminPass123!";
const STEP_S = Number(process.env.STEP || 4);
const SPEED_M = Number(process.env.SPEED || 60);

const stamp = Date.now().toString().slice(-6);
let TOKEN = "";

async function call(method, path, body, extraHeaders = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok || json.success === false) {
    throw new Error(
      `${method} ${path} -> ${res.status} ${JSON.stringify(json.error ?? json).slice(0, 300)}`
    );
  }
  return json.data;
}

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// A short arc through central Bengaluru: [lng, lat] pairs.
const LINE = [
  [77.5946, 12.9716],
  [77.6033, 12.9762],
  [77.6101, 12.9784],
  [77.6169, 12.9723],
  [77.6212, 12.9665],
  [77.6278, 12.9611],
];

const haversine = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const bearing = ([lng1, lat1], [lng2, lat2]) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (Math.atan2(y, x) * 180) / Math.PI;
};

/** Densify the polyline so each hop is ~SPEED_M metres. */
function densify(line, stepM) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const d = haversine(a, b);
    const n = Math.max(1, Math.round(d / stepM));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

async function main() {
  console.log(`login ${EMAIL} @ ${API}`);
  const auth = await call("POST", "/auth/login", { email: EMAIL, password: PASS });
  TOKEN = auth.accessToken;

  console.log("creating stops…");
  const stops = [];
  for (let i = 0; i < LINE.length; i++) {
    const [lng, lat] = LINE[i];
    const { stop } = await call("POST", "/admin/stops", {
      name: `Sim Stop ${i + 1} (${stamp})`,
      code: `SIM${stamp}-${i + 1}`,
      location: { type: "Point", coordinates: [lng, lat] },
      accessibility: false,
    });
    stops.push(stop);
  }

  console.log("creating route…");
  const { route } = await call("POST", "/admin/routes", {
    routeNumber: `SIM${stamp}`,
    name: "GPS simulator route",
    status: "ACTIVE",
    geometry: { type: "LineString", coordinates: LINE },
    orderedStops: stops.map((s, i) => ({
      stopId: s._id,
      sequence: i,
      scheduledOffsetMinutes: i * 4,
    })),
  });

  console.log("creating vehicle…");
  const { vehicle } = await call("POST", "/admin/vehicles", {
    registrationNumber: `SIM-${stamp}`,
    type: "BUS",
    capacity: 40,
    status: "ACTIVE",
    assignedRoute: route._id,
  });

  console.log("creating driver user + record…");
  const { user } = await call("POST", "/admin/users", {
    name: `Sim Driver ${stamp}`,
    email: `sim.driver.${stamp}@test.local`,
    password: "Passw0rd!23",
    role: "DRIVER",
    phone: `+1555${stamp}`,
  });
  const { driver } = await call("POST", "/admin/drivers", {
    user: user._id,
    name: `Sim Driver ${stamp}`,
    employeeId: `SIMEMP-${stamp}`,
    licenseNumber: `SIM-DL-${stamp}`,
    status: "ACTIVE",
    shift: { type: "MORNING" },
  });

  console.log("creating + activating trip…");
  const { trip } = await call("POST", "/admin/trips", {
    route: route._id,
    vehicle: vehicle._id,
    driver: driver._id,
    scheduledStartAt: new Date().toISOString(),
  });
  await call("POST", `/admin/trips/${trip._id}/assign`, {
    driverId: driver._id,
    vehicleId: vehicle._id,
    conductorId: null,
  });
  await call("POST", `/admin/trips/${trip._id}/transition`, { status: "ACTIVE" });

  console.log(`
  route    ${route._id}  (${route.routeNumber})
  vehicle  ${vehicle._id}  (${vehicle.registrationNumber})
  trip     ${trip._id}  ACTIVE
  → open the admin Live map, pick route "${route.routeNumber}", or the PWA /map
`);

  const path = densify(LINE, SPEED_M);
  console.log(`walking ${path.length} points, ${STEP_S}s apart… Ctrl+C to stop\n`);

  let i = 0;
  for (;;) {
    const cur = path[i % path.length];
    const nxt = path[(i + 1) % path.length];
    const speedKmh = (SPEED_M / STEP_S) * 3.6;
    try {
      await call(
        "POST",
        "/tracking/location",
        {
          vehicleId: vehicle._id,
          tripId: trip._id,
          driverId: driver._id,
          latitude: cur[1],
          longitude: cur[0],
          speed: Math.round(speedKmh),
          heading: Math.round((bearing(cur, nxt) + 360) % 360),
          accuracy: 5,
          timestamp: Date.now(),
        },
        { "Idempotency-Key": uuid() }
      );
      process.stdout.write(
        `\r  fix ${String(i + 1).padStart(4)}  ${cur[1].toFixed(5)}, ${cur[0].toFixed(5)}   `
      );
    } catch (e) {
      console.log(`\n  fix failed: ${e.message}`);
    }
    i++;
    await new Promise((r) => setTimeout(r, STEP_S * 1000));
  }
}

main().catch((e) => {
  console.error("\nsim failed:", e.message);
  process.exit(1);
});
