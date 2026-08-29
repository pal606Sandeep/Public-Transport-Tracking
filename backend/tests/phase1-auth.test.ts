import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { boot, shutdown, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD, DRIVER_EMAIL, DRIVER_PASSWORD, loginToken } from "./support.js";

let req: ReturnType<typeof boot> extends Promise<infer T> ? T["request"] : never;

beforeAll(async () => {
  const b = await boot();
  req = b.request;
});

afterAll(async () => {
  await shutdown();
});

const refreshFrom = (res: { headers: Record<string, unknown> }): string => {
  const cookies = res.headers["set-cookie"] as unknown as string[];
  const line = cookies.find((c) => c.startsWith("refresh_token="));
  if (!line) throw new Error("no refresh cookie");
  return line.split(";")[0].replace("refresh_token=", "");
};

describe("P1-07 — Register + login", () => {
  it("registers a new user (201) with default PASSENGER role", async () => {
    const res = await req
      .post("/api/v1/auth/register")
      .send({ name: "New", email: "new@test.com", password: "Secret123!" })
      .expect(201);
    expect(res.body.data.user.role).toBe("PASSENGER");
  });

  it("returns 409 for a duplicate email", async () => {
    await req
      .post("/api/v1/auth/register")
      .send({ name: "Dup", email: "dup@test.com", password: "Secret123!" })
      .expect(201);
    const res = await req
      .post("/api/v1/auth/register")
      .send({ name: "Dup", email: "dup@test.com", password: "Secret123!" })
      .expect(409);
    expect(res.body.error.code).toBe("EMAIL_IN_USE");
  });

  it("login with wrong password → 401", async () => {
    await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: "WrongPass1!" })
      .expect(401);
  });

  it("login ok → returns user + access token and sets refresh cookie", async () => {
    const res = await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(USER_EMAIL);
    expect(res.headers["set-cookie"]).toBeDefined();
  });
});

describe("P1-08 — Access token + refresh cookie + rotation", () => {
  it("refresh rotates the token and the fresh token continues to work", async () => {
    const login = await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    const refreshA = refreshFrom(login);

    const r1 = await req.post("/api/v1/auth/refresh").send({ refreshToken: refreshA }).expect(200);
    expect(r1.body.data.accessToken).toBeTruthy();

    // Freshly rotated token works (no reuse happened).
    const refreshB = refreshFrom(r1);
    const r2 = await req.post("/api/v1/auth/refresh").send({ refreshToken: refreshB }).expect(200);
    expect(r2.body.data.accessToken).toBeTruthy();
  });

  it("reusing an already-rotated token is detected and revokes the family", async () => {
    const login = await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    const refreshA = refreshFrom(login);

    // Rotate A -> B. Now A is the "old" rotated token.
    const r1 = await req.post("/api/v1/auth/refresh").send({ refreshToken: refreshA }).expect(200);
    const refreshB = refreshFrom(r1);

    // Reuse of A is flagged as token theft.
    const misuse = await req.post("/api/v1/auth/refresh").send({ refreshToken: refreshA }).expect(401);
    expect(misuse.body.error.code).toBe("REUSE_DETECTED");

    // The whole family (including B) is now revoked.
    await req.post("/api/v1/auth/refresh").send({ refreshToken: refreshB }).expect(401);
  });

  it("accepts refresh token via Authorization: Bearer", async () => {
    const login = await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    const refresh = refreshFrom(login);
    const res = await req
      .post("/api/v1/auth/refresh")
      .set("Authorization", `Bearer ${refresh}`)
      .expect(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("tampered refresh token → 401", async () => {
    await req.post("/api/v1/auth/refresh").send({ refreshToken: "tampered.token.value" }).expect(401);
  });
});

describe("P1-09 — Mobile OTP + abuse protection", () => {
  const captureOtp = async (phone: string): Promise<string> => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
    await req.post("/api/v1/auth/otp/request").send({ phone }).expect(200);
    spy.mockRestore();
    const line = logs.find((l) => l.includes("[DEV-OTP]"));
    if (!line) throw new Error("OTP not logged");
    const m = line.match(/-> (\d{6})/);
    if (!m) throw new Error("OTP pattern not found");
    return m[1];
  };

  it("valid OTP flow logs the user in", async () => {
    const phone = "+919811000001";
    const otp = await captureOtp(phone);
    const res = await req
      .post("/api/v1/auth/otp/verify")
      .send({ phone, otp })
      .expect(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it("resend before cooldown → 429 OTP_COOLDOWN", async () => {
    const phone = "+919811000002";
    await req.post("/api/v1/auth/otp/request").send({ phone }).expect(200);
    const res = await req.post("/api/v1/auth/otp/request").send({ phone }).expect(429);
    expect(res.body.error.code).toBe("OTP_COOLDOWN");
  });

  it("wrong-OTP attempt cap locks the number", async () => {
    const phone = "+919811000003";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await req.post("/api/v1/auth/otp/request").send({ phone }).expect(200);
    logSpy.mockRestore();

    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await req
        .post("/api/v1/auth/otp/verify")
        .send({ phone, otp: "000000" });
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("P1-10 — Logout + sessions", () => {
  it("logout invalidates the refresh token", async () => {
    const login = await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    const refresh = refreshFrom(login);

    await req.post("/api/v1/auth/logout").send({ refreshToken: refresh }).expect(200);

    const res = await req.post("/api/v1/auth/refresh").send({ refreshToken: refresh }).expect(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH");
  });

  it("lists active sessions and can revoke one", async () => {
    const login = await req
      .post("/api/v1/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    const token = login.body.data.accessToken;
    const refresh = refreshFrom(login);

    const list = await req.get("/api/v1/auth/sessions").set("Authorization", `Bearer ${token}`).expect(200);
    expect(list.body.data.sessions.length).toBeGreaterThanOrEqual(1);

    const sessionId = list.body.data.sessions[0].sessionId;
    await req
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Revoked session's refresh token can no longer refresh.
    await req.post("/api/v1/auth/refresh").send({ refreshToken: refresh }).expect(401);
  });
});

describe("P1-11 — Forgot / reset / change password", () => {
  it("reset token is single-use and changes the password", async () => {
    const email = "reset@test.com";
    await req
      .post("/api/v1/auth/register")
      .send({ name: "Reset", email, password: "OldPass123!" })
      .expect(201);

    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
    await req.post("/api/v1/auth/password/forgot").send({ email }).expect(200);
    spy.mockRestore();
    const line = logs.find((l) => l.includes("[DEV-RESET]"));
    const token = line!.match(/-> (\S+)$/)![1];

    const res = await req
      .post("/api/v1/auth/password/reset")
      .send({ token, newPassword: "NewPass123!" })
      .expect(200);

    // Reuse of the same token is rejected.
    await req
      .post("/api/v1/auth/password/reset")
      .send({ token, newPassword: "Another1!" })
      .expect(400);

    // Old password fails, new works.
    await req.post("/api/v1/auth/login").send({ email, password: "OldPass123!" }).expect(401);
    await req.post("/api/v1/auth/login").send({ email, password: "NewPass123!" }).expect(200);
  });

  it("change password with wrong current → 401", async () => {
    const token = await loginToken(req, USER_EMAIL, USER_PASSWORD);
    const res = await req
      .post("/api/v1/auth/password/change")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "WrongCurrent1!", newPassword: "BrandNew123!" })
      .expect(401);
    expect(res.body.error.code).toBe("WRONG_PASSWORD");
  });
});

describe("P1-12 — Guest sessions", () => {
  it("issues a short-lived guest token usable on read endpoints", async () => {
    const guest = await req.post("/api/v1/auth/guest").expect(200);
    const token: string = guest.body.data.token;

    const time = await req.get("/api/v1/time").set("Authorization", `Bearer ${token}`).expect(200);
    expect(time.body.data.serverTime).toBeTypeOf("number");
  });

  it("denies guest access to privileged routes", async () => {
    const guest = await req.post("/api/v1/auth/guest").expect(200);
    const token: string = guest.body.data.token;
    await req.get("/api/v1/rbac/roles").set("Authorization", `Bearer ${token}`).expect(403);
  });
});

describe("P1-13 — Profile management", () => {
  it("GET /me returns the profile; PATCH updates it", async () => {
    const token = await loginToken(req, USER_EMAIL, USER_PASSWORD);
    const me = await req.get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`).expect(200);
    expect(me.body.data.user.email).toBe(USER_EMAIL);

    const upd = await req
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name", language: "hi" })
      .expect(200);
    expect(upd.body.data.user.name).toBe("Updated Name");
    expect(upd.body.data.user.language).toBe("hi");
  });

  it("unauthorised /me → 401", async () => {
    await req.get("/api/v1/auth/me").expect(401);
  });
});

describe("P1-16 — Device / Web-Push subscription registration", () => {
  it("registers a device, patches a push subscription, and deletes it", async () => {
    const token = await loginToken(req, USER_EMAIL, USER_PASSWORD);
    const created = await req
      .post("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ deviceId: "web-1", name: "Chrome", platform: "web" })
      .expect(201);
    expect(created.body.data.status).toBe("ACTIVE");

    await req
      .post("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ deviceId: "web-1", pushSubscription: { endpoint: "https://push/abc" } })
      .expect(201);

    const list = await req
      .get("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.data.devices[0].pushSubscription.endpoint).toBe("https://push/abc");

    await req
      .delete("/api/v1/auth/devices/web-1")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const after = await req
      .get("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(after.body.data.devices).toHaveLength(0);
  });

  it("a driver's second device is held PENDING (not ACTIVE)", async () => {
    const token = await loginToken(req, DRIVER_EMAIL, DRIVER_PASSWORD);
    await req
      .post("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ deviceId: "d-1" })
      .expect(201);
    const second = await req
      .post("/api/v1/auth/devices")
      .set("Authorization", `Bearer ${token}`)
      .send({ deviceId: "d-2" })
      .expect(201);
    expect(second.body.data.status).toBe("PENDING");
  });
});
