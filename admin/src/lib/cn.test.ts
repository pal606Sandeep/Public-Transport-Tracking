import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy parts with a space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy parts", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("returns an empty string for nothing", () => {
    expect(cn()).toBe("");
    expect(cn(false, null)).toBe("");
  });
});
