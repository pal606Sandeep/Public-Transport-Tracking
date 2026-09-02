import { ApiError, isApiError, errorMessage } from "./apiError";

describe("ApiError", () => {
  it("carries status / code / details / traceId", () => {
    const e = new ApiError(422, {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { email: ["required"] },
      traceId: "abc",
    });
    expect(e.status).toBe(422);
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.traceId).toBe("abc");
    expect(e.message).toBe("Validation failed");
  });

  it("defaults code to UNKNOWN", () => {
    expect(new ApiError(500, { message: "x" }).code).toBe("UNKNOWN");
  });

  it("isAuth / isForbidden reflect status", () => {
    expect(new ApiError(401, { message: "x" }).isAuth).toBe(true);
    expect(new ApiError(403, { message: "x" }).isForbidden).toBe(true);
    expect(new ApiError(400, { message: "x" }).isAuth).toBe(false);
  });

  it("fieldErrors normalises to { field: string[] }", () => {
    const e = new ApiError(422, {
      message: "x",
      details: { email: "required", age: [1, 2] },
    });
    expect(e.fieldErrors()).toEqual({
      email: ["required"],
      age: ["1", "2"],
    });
  });

  it("fieldErrors is {} when there are no details", () => {
    expect(new ApiError(500, { message: "x" }).fieldErrors()).toEqual({});
  });
});

describe("helpers", () => {
  it("isApiError narrows correctly", () => {
    expect(isApiError(new ApiError(400, { message: "x" }))).toBe(true);
    expect(isApiError(new Error("x"))).toBe(false);
    expect(isApiError("x")).toBe(false);
  });

  it("errorMessage extracts .message or a fallback", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("nope")).toBe("Something went wrong");
    expect(errorMessage(null)).toBe("Something went wrong");
  });
});
