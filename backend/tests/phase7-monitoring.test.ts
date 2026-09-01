import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, shutdown } from "./support.js";
import {
  incCounter,
  setGauge,
  observeHistogram,
  exposeMetrics,
  resetMetrics,
  registerDefaultMetrics,
  registerCounter,
  registerGauge,
  registerHistogram,
} from "../src/utils/metrics.js";
import { captureException, initSentry, isSentryActive } from "../src/utils/sentry.js";

type Boot = Awaited<ReturnType<typeof boot>>;
let req: Boot["request"];

beforeAll(async () => {
  const b = await boot();
  req = b.request;
});

afterAll(async () => {
  await shutdown();
});

describe("P1-57 — Monitoring + logging", () => {
  describe("Prometheus metrics registry", () => {
    it("counters increment and expose in text format", () => {
      resetMetrics();
      registerCounter("test_counter", "A test counter");
      incCounter("test_counter");
      incCounter("test_counter");
      incCounter("test_counter", { route: "/api/v1/x" });
      const out = exposeMetrics();
      expect(out).toMatch(/# HELP test_counter A test counter/);
      expect(out).toMatch(/# TYPE test_counter counter/);
      expect(out).toMatch(/^test_counter 2$/m);
      expect(out).toMatch(/^test_counter\{route="\/api\/v1\/x"\} 1$/m);
    });

    it("gauges set and overwrite", () => {
      resetMetrics();
      registerGauge("test_gauge", "A test gauge");
      setGauge("test_gauge", 1);
      setGauge("test_gauge", 5);
      const out = exposeMetrics();
      expect(out).toMatch(/^test_gauge 5$/m);
    });

    it("histograms bucket samples and produce bucket/sum/count lines", () => {
      resetMetrics();
      registerHistogram("test_hist", "A test histogram");
      observeHistogram("test_hist", 0.001);
      observeHistogram("test_hist", 0.5);
      observeHistogram("test_hist", 3);
      const out = exposeMetrics();
      expect(out).toMatch(/# HELP test_hist A test histogram/);
      expect(out).toMatch(/# TYPE test_hist histogram/);
      expect(out).toMatch(/test_hist_bucket\{le="0\.005"\} 1/);
      expect(out).toMatch(/test_hist_bucket\{le="0\.5"\} 2/);
      expect(out).toMatch(/test_hist_bucket\{le="\+Inf"\} 3/);
      expect(out).toMatch(/test_hist_count 3/);
      expect(out).toMatch(/test_hist_sum /);
    });

    it("registerDefaultMetrics registers the standard set", () => {
      resetMetrics();
      registerDefaultMetrics();
      const out = exposeMetrics();
      expect(out).toMatch(/^# TYPE http_requests_total counter/m);
      expect(out).toMatch(/^# TYPE http_request_duration_seconds histogram/m);
      expect(out).toMatch(/^# TYPE mongo_up gauge/m);
      expect(out).toMatch(/^# TYPE redis_up gauge/m);
      expect(out).toMatch(/^# TYPE queue_pending gauge/m);
      expect(out).toMatch(/^# TYPE sentry_captured_total counter/m);
    });
  });

  describe("Sentry seam", () => {
    it("initSentry is a no-op without SENTRY_DSN", () => {
      delete process.env.SENTRY_DSN;
      initSentry();
      expect(isSentryActive()).toBe(false);
    });

    it("captureException logs without throwing", () => {
      expect(() => captureException(new Error("boom"), { context: "unit" })).not.toThrow();
      expect(() => captureException("string error")).not.toThrow();
      expect(() => captureException(null)).not.toThrow();
    });
  });

  describe("/metrics endpoint", () => {
    it("GET /metrics returns Prometheus text format", async () => {
      const res = await req.get("/metrics").expect(200);
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
      expect(typeof res.text).toBe("string");
      expect(res.text).toMatch(/# HELP/);
      expect(res.text).toMatch(/# TYPE http_requests_total counter/);
      expect(res.text).toMatch(/# TYPE mongo_up gauge/);
    });

    it("GET /metrics shows mongo_up=1", async () => {
      const res = await req.get("/metrics").expect(200);
      expect(res.text).toMatch(/^mongo_up 1$/m);
    });

    it("GET /metrics exposes redis_up gauge", async () => {
      const res = await req.get("/metrics").expect(200);
      expect(res.text).toMatch(/^# TYPE redis_up gauge/m);
      expect(res.text).toMatch(/^redis_up [01]$/m);
    });

    it("GET /metrics records http_requests_total for handled routes", async () => {
      await req.get("/api/v1/health").expect(200);
      const res = await req.get("/metrics").expect(200);
      expect(res.text).toMatch(/http_requests_total\{method="GET",route="\/api\/v1\/health",status="200"\} \d+/);
    });
  });
});