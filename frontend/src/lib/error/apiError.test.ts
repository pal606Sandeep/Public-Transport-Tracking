import { ApiError, isApiError, errorMessage } from "./apiError";

describe("ApiError", () => {
  it("captures status, message and defaults code to UNKNOWN", () => {
    const e = new ApiError(500, { message: "boom" });
    expect(e.status).toBe(500);
    expect(e.message).toBe("boom");
    expect(e.code).toBe("UNKNOWN");
    expect(e.name).toBe("ApiError");
  });

  it("exposes isAuth / isForbidden from the status", () => {
    expect(new ApiError(401, { message: "x" }).isAuth).toBe(true);
    expect(new ApiError(403, { message: "x" }).isForbidden).toBe(true);
    expect(new ApiError(500, { message: "x" }).isAuth).toBe(false);
  });

  it("normalises details into { field: string[] } via fieldErrors()", () => {
    const e = new ApiError(422, {
      message: "invalid",
      details: { email: "required", tags: ["a", "b"] },
    });
    expect(e.fieldErrors()).toEqual({ email: ["required"], tags: ["a", "b"] });
  });

  it("fieldErrors() is {} when there are no details", () => {
    expect(new ApiError(400, { message: "x" }).fieldErrors()).toEqual({});
  });

  it("isApiError is a working type guard", () => {
    expect(isApiError(new ApiError(400, { message: "x" }))).toBe(true);
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError("nope")).toBe(false);
  });

  it("errorMessage unwraps Error, falls back otherwise", () => {
    expect(errorMessage(new Error("nope"))).toBe("nope");
    expect(errorMessage({})).toBe("Something went wrong");
  });
});
