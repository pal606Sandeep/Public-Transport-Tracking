import { roleArea, ROLES } from "./roles";

describe("roleArea", () => {
  it("maps driver/conductor to operations", () => {
    expect(roleArea(ROLES.DRIVER)).toBe("operations");
    expect(roleArea(ROLES.CONDUCTOR)).toBe("operations");
  });

  it("maps passenger/guest to passenger", () => {
    expect(roleArea(ROLES.PASSENGER)).toBe("passenger");
    expect(roleArea(ROLES.GUEST)).toBe("passenger");
  });

  it("maps staff/admin roles and unknowns to unknown", () => {
    expect(roleArea(ROLES.SUPER_ADMIN)).toBe("unknown");
    expect(roleArea("NONSENSE")).toBe("unknown");
    expect(roleArea(undefined)).toBe("unknown");
  });
});
