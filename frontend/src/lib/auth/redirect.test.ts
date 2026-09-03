import { homePathForRole, isVersionBelow } from "./redirect";

describe("homePathForRole", () => {
  it("routes drivers and conductors to their consoles", () => {
    expect(homePathForRole("DRIVER")).toBe("/driver");
    expect(homePathForRole("CONDUCTOR")).toBe("/conductor");
  });

  it("routes passengers and guests to the map", () => {
    expect(homePathForRole("PASSENGER")).toBe("/map");
    expect(homePathForRole("GUEST")).toBe("/map");
  });

  it("falls back to /login for unknown or missing roles", () => {
    expect(homePathForRole("SUPER_ADMIN")).toBe("/login");
    expect(homePathForRole(undefined)).toBe("/login");
  });
});

describe("isVersionBelow", () => {
  it("is true only when current is strictly older than min", () => {
    expect(isVersionBelow("1.0.0", "1.2.0")).toBe(true);
    expect(isVersionBelow("1.2.0", "1.2.0")).toBe(false);
    expect(isVersionBelow("2.0.0", "1.9.9")).toBe(false);
  });

  it("compares segment by segment, not lexically", () => {
    expect(isVersionBelow("1.9.0", "1.10.0")).toBe(true);
  });

  it("tolerates differing segment counts", () => {
    expect(isVersionBelow("1.2", "1.2.1")).toBe(true);
    expect(isVersionBelow("1.2.0", "1.2")).toBe(false);
  });
});
