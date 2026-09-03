import { enqueue, flushOutbox, outboxCount } from "./outbox";
import { db } from "./db";
import { setAccessToken } from "@/lib/auth/tokenStore";

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, "onLine", { value, configurable: true });

/** Minimal stand-in for a fetch Response (jsdom has no global Response). */
const resp = (status: number) =>
  ({ ok: status >= 200 && status < 300, status }) as unknown as Response;

describe("offline outbox", () => {
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    await db.outbox.clear();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    setAccessToken("tok-abc");
    setOnline(true);
  });

  it("enqueue stores a normalised entry with a seeded Authorization header", async () => {
    await enqueue({
      url: "https://api.test/complaints",
      method: "post",
      body: { subject: "hi" },
      label: "Complaint",
    });

    const [entry] = await db.outbox.toArray();
    expect(entry).toMatchObject({
      url: "https://api.test/complaints",
      method: "POST",
      body: JSON.stringify({ subject: "hi" }),
      label: "Complaint",
      attempts: 0,
    });
    expect(entry.headers.Authorization).toBe("Bearer tok-abc");
    expect(await outboxCount()).toBe(1);
  });

  it("flushOutbox replays entries oldest-first and clears delivered ones", async () => {
    await enqueue({ url: "https://api.test/a", method: "POST", label: "A" });
    await enqueue({ url: "https://api.test/b", method: "POST", label: "B" });
    fetchMock.mockResolvedValue(resp(201));

    const result = await flushOutbox();

    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.test/a");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.test/b");
    expect(await outboxCount()).toBe(0);
  });

  it("keeps an entry queued on a 5xx but drops it on a 4xx", async () => {
    await enqueue({ url: "https://api.test/server-err", method: "POST", label: "S" });
    await enqueue({ url: "https://api.test/bad-req", method: "POST", label: "B" });
    fetchMock
      .mockResolvedValueOnce(resp(503))
      .mockResolvedValueOnce(resp(422));

    const result = await flushOutbox();

    expect(result).toEqual({ sent: 0, failed: 2 });
    const left = await db.outbox.toArray();
    expect(left).toHaveLength(1);
    expect(left[0].url).toBe("https://api.test/server-err");
    expect(left[0].attempts).toBe(1);
  });

  it("is a no-op while offline", async () => {
    await enqueue({ url: "https://api.test/a", method: "POST", label: "A" });
    setOnline(false);

    const result = await flushOutbox();

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await outboxCount()).toBe(1);
  });
});
