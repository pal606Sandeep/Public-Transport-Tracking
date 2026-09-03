import "@testing-library/jest-dom";
// In-memory IndexedDB so the offline outbox / ref-cache can be unit-tested.
import "fake-indexeddb/auto";

// jsdom doesn't expose these Node globals that fake-indexeddb / Dexie rely on.
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value: unknown) =>
    JSON.parse(JSON.stringify(value));
}
