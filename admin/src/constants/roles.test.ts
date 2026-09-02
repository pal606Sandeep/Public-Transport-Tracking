import { isAdminRole, isFullAdmin, ROLES } from "./roles";

describe("role helpers", () => {
  it("isAdminRole accepts every staff role", () => {
    for (const r of [
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.TRANSPORT_MANAGER,
      ROLES.DISPATCHER,
      ROLES.MAINTENANCE_MANAGER,
      ROLES.SUPPORT_STAFF,
    ]) {
      expect(isAdminRole(r)).toBe(true);
    }
  });

  it("isAdminRole rejects rider / driver / guest / unknown", () => {
    for (const r of [
      ROLES.PASSENGER,
      ROLES.DRIVER,
      ROLES.CONDUCTOR,
      ROLES.GUEST,
      "WHATEVER",
      "",
      null,
      undefined,
    ]) {
      expect(isAdminRole(r as string | null)).toBe(false);
    }
  });

  it("isFullAdmin is only SUPER_ADMIN / ADMIN", () => {
    expect(isFullAdmin(ROLES.SUPER_ADMIN)).toBe(true);
    expect(isFullAdmin(ROLES.ADMIN)).toBe(true);
    expect(isFullAdmin(ROLES.TRANSPORT_MANAGER)).toBe(false);
    expect(isFullAdmin(ROLES.DISPATCHER)).toBe(false);
  });
});
