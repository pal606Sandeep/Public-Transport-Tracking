import { api } from "./apiClient";
import { ApiError } from "@/lib/error/apiError";
import { getAccessToken, setAccessToken } from "@/lib/auth/tokenStore";

type Body = Record<string, unknown>;

const jsonRes = (status: number, body: Body): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }) as unknown as Response;

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  setAccessToken(null);
});

describe("apiClient", () => {
  it("returns the parsed body on success and sends the bearer token", async () => {
    setAccessToken("tok-1");
    fetchMock.mockResolvedValueOnce(
      jsonRes(200, { success: true, message: "ok", data: { hello: "world" } })
    );

    const res = await api.get<{ hello: string }>("/thing");

    expect(res.data).toEqual({ hello: "world" });
    const [, init] = fetchMock.mock.calls[0];
    expect(
      (init?.headers as Record<string, string>).Authorization
    ).toBe("Bearer tok-1");
  });

  it("throws an ApiError carrying the error envelope on a non-2xx", async () => {
    fetchMock.mockResolvedValue(
      jsonRes(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "bad input",
          traceId: "t1",
        },
      })
    );

    const err = await api.post("/thing", {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "bad input",
      traceId: "t1",
    });
  });

  it("throws when the body says success:false even on a 200", async () => {
    fetchMock.mockResolvedValue(
      jsonRes(200, { success: false, message: "nope" })
    );
    await expect(api.get("/thing")).rejects.toThrow("nope");
  });

  it("on 401 it refreshes once, stores the new token and retries", async () => {
    setAccessToken("stale");
    fetchMock
      // 1) original request -> 401
      .mockResolvedValueOnce(jsonRes(401, { error: { code: "TOKEN_EXPIRED" } }))
      // 2) POST /auth/refresh -> new token
      .mockResolvedValueOnce(
        jsonRes(200, { success: true, message: "ok", data: { accessToken: "fresh" } })
      )
      // 3) retried request -> success
      .mockResolvedValueOnce(
        jsonRes(200, { success: true, message: "ok", data: { ok: 1 } })
      );

    const res = await api.get<{ ok: number }>("/secure");

    expect(res.data).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    expect(getAccessToken()).toBe("fresh");
    // the retry used the refreshed bearer
    const retryInit = fetchMock.mock.calls[2][1];
    expect(
      (retryInit?.headers as Record<string, string>).Authorization
    ).toBe("Bearer fresh");
  });

  it("does not retry when the refresh call itself fails", async () => {
    setAccessToken("stale");
    fetchMock
      .mockResolvedValueOnce(jsonRes(401, { error: { code: "TOKEN_EXPIRED" } }))
      .mockResolvedValueOnce(jsonRes(401, { error: { code: "NO_REFRESH" } }));

    await expect(api.get("/secure")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
