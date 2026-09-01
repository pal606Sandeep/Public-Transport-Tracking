/**
 * Prometheus-style metrics registry + `/metrics` exposition.
 *
 * Lightweight, dependency-free implementation: counters + gauges + histograms
 * with `prom-client`-compatible text output (line per metric, `# HELP`,
 * `# TYPE`, sample lines). `prom-client` itself isn't installed in this repo,
 * so the same exposition format is reproduced here in ~150 lines.
 *
 * Metrics are process-global (Map keyed by name). Histograms use the default
 * buckets {0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10} seconds.
 */

type LabelValues = Record<string, string>;

interface CounterSeries { values: Map<string, number>; help: string }
interface GaugeSeries { values: Map<string, number>; help: string }
interface HistogramSeries {
  buckets: Map<string, number[]>;
  sums: Map<string, number>;
  counts: Map<string, number>;
  help: string;
}

const counters = new Map<string, CounterSeries>();
const gauges = new Map<string, GaugeSeries>();
const histograms = new Map<string, HistogramSeries>();

const DEFAULT_BUCKETS: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

const labelKey = (labels?: LabelValues): string => {
  if (!labels || Object.keys(labels).length === 0) return "";
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join("|");
};

const escapeHelp = (s: string): string => s.replace(/\\/g, "\\\\").replace(/\n/g, " ");

export const registerCounter = (name: string, help: string): void => {
  if (!counters.has(name)) counters.set(name, { values: new Map(), help });
};

export const incCounter = (name: string, labels?: LabelValues, value = 1): void => {
  const c = counters.get(name);
  if (!c) return;
  const k = labelKey(labels);
  c.values.set(k, (c.values.get(k) ?? 0) + value);
};

export const registerGauge = (name: string, help: string): void => {
  if (!gauges.has(name)) gauges.set(name, { values: new Map(), help });
};

export const setGauge = (name: string, value: number, labels?: LabelValues): void => {
  const g = gauges.get(name);
  if (!g) return;
  g.values.set(labelKey(labels), value);
};

export const incGauge = (name: string, labels?: LabelValues, value = 1): void => {
  const g = gauges.get(name);
  if (!g) return;
  const k = labelKey(labels);
  g.values.set(k, (g.values.get(k) ?? 0) + value);
};

export const registerHistogram = (name: string, help: string): void => {
  if (!histograms.has(name)) {
    histograms.set(name, {
      buckets: new Map(),
      sums: new Map(),
      counts: new Map(),
      help,
    });
  }
};

export const observeHistogram = (name: string, value: number, labels?: LabelValues): void => {
  const h = histograms.get(name);
  if (!h) return;
  const k = labelKey(labels);
  const arr = h.buckets.get(k) ?? new Array(DEFAULT_BUCKETS.length).fill(0);
  arr.forEach((b, i) => {
    if (value <= DEFAULT_BUCKETS[i]) arr[i] += 1;
  });
  h.buckets.set(k, arr);
  h.sums.set(k, (h.sums.get(k) ?? 0) + value);
  h.counts.set(k, (h.counts.get(k) ?? 0) + 1);
};

const labelStr = (k: string): string => {
  if (!k) return "";
  const parts = k.split("|").map((kv) => {
    const eq = kv.indexOf("=");
    return `${kv.slice(0, eq)}="${kv.slice(eq + 1)}"`;
  });
  return `{${parts.join(",")}}`;
};

export const exposeMetrics = (): string => {
  const lines: string[] = [];

  for (const [name, c] of counters) {
    lines.push(`# HELP ${name} ${escapeHelp(c.help)}`);
    lines.push(`# TYPE ${name} counter`);
    for (const [k, v] of c.values) lines.push(`${name}${labelStr(k)} ${v}`);
  }

  for (const [name, g] of gauges) {
    lines.push(`# HELP ${name} ${escapeHelp(g.help)}`);
    lines.push(`# TYPE ${name} gauge`);
    for (const [k, v] of g.values) lines.push(`${name}${labelStr(k)} ${v}`);
  }

  for (const [name, h] of histograms) {
    lines.push(`# HELP ${name} ${escapeHelp(h.help)}`);
    lines.push(`# TYPE ${name} histogram`);
    for (const [k, arr] of h.buckets) {
      const prefix = k ? `{${k},` : `{`;
      arr.forEach((b, i) => {
        const le = DEFAULT_BUCKETS[i];
        lines.push(`${name}_bucket${prefix}le="${le}"} ${b}`);
      });
      lines.push(`${name}_bucket${prefix}le="+Inf"} ${h.counts.get(k) ?? 0}`);
      const sum = h.sums.get(k) ?? 0;
      lines.push(`${name}_sum${labelStr(k)} ${sum}`);
      lines.push(`${name}_count${labelStr(k)} ${h.counts.get(k) ?? 0}`);
    }
  }

  return lines.join("\n") + "\n";
};

export const resetMetrics = (): void => {
  counters.clear();
  gauges.clear();
  histograms.clear();
};

export const registerDefaultMetrics = (): void => {
  registerCounter("http_requests_total", "Total HTTP requests served");
  registerHistogram("http_request_duration_seconds", "HTTP request duration in seconds");
  registerCounter("http_requests_errors_total", "Total HTTP responses with status >= 500");
  registerCounter("redis_ops_total", "Total Redis operations");
  registerGauge("mongo_up", "MongoDB connection state (1 up / 0 down)");
  registerGauge("redis_up", "Redis connection state (1 up / 0 down)");
  registerCounter("queue_jobs_total", "Total BullMQ jobs enqueued");
  registerCounter("queue_jobs_failed_total", "Total BullMQ jobs that failed");
  registerGauge("queue_pending", "Number of jobs waiting in a queue");
  registerCounter("sentry_captured_total", "Total errors captured by the Sentry seam");
};