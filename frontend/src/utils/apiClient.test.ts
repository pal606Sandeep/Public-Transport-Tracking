import { api, QueuedResponse } from "./apiClient";
import { ApiError } from "@/lib/error/apiError";
import { setAccessToken } from "@/lib/auth/tokenStore";

/** Minimal stand-in for a fetch Response (jsdom has no global Response). */
const jsonResponse = (body: unknown, init: { status?: number } = {}) => {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
};

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, "onLine", { value, configurable: true });

describe("apiClient", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    setAccessToken("tok-123");
    setOnline(true);
  });

  it("sends the bearer token and unwraps the envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, data: { hello: "world" } })
    );

    const res = await api.get<{ hello: string }>("/thing");

    expect(res.data).toEqual({ hello: "world" });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-123"
    );
  });

  it("throws an ApiError built from the error envelope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: "BAD", message: "nope", traceId: "t1" } },
        { status: 400 }
      )
    );

    const err = await api.post("/thing", {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: "BAD", message: "nope" });
  });

  it("throws when the body says success:false", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: false, message: "rejected" })
    );
    const err = await api.get("/thing").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("rejected");
  });

  it("on 401 refreshes once and retries with the fresh token", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: "expired" } }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "tok-fresh" } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ok: true } }));

    const res = await api.get<{ ok: boolean }>("/secure");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    const [, retryInit] = fetchMock.mock.calls[2];
    expect((retryInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-fresh"
    );
    expect(res.data).toEqual({ ok: true });
  });

  it("does not retry when the refresh call also fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: { message: "expired" } }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 401 }));

    await api.get("/secure").catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("parks the request in the outbox when offline and queueOffline is set", async () => {
    setOnline(false);
    const { db } = await import("@/lib/offline/db");
    await db.outbox.clear();

    const res = await api.post("/complaints", { subject: "x" }, {
      queueOffline: true,
      queueLabel: "Complaint",
    });

    expect(res).toBeInstanceOf(QueuedResponse);
    expect((res as unknown as QueuedResponse).queued).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await db.outbox.count()).toBe(1);
  });
});
